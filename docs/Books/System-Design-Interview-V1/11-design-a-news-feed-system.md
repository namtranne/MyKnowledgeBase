# Chapter 11 — Design a News Feed System

> A news feed is the constantly updating list of stories in the middle of your Facebook, Twitter, LinkedIn, or Instagram home page. It aggregates content from friends, groups, and pages you follow, and displays it in a personalized order.

---

## Requirements

| Requirement | Detail |
|------------|--------|
| **Platforms** | Mobile (iOS, Android) and Web |
| **Key features** | Publish a post; view personalized news feed |
| **Content** | Text, images, videos |
| **Ordering** | Reverse chronological (with optional ranking) |
| **Friends** | A user can have up to 5,000 friends |
| **Scale** | 10 million DAU |
| **Traffic** | Feed retrieval is the most frequent operation |

---

## Two Core Flows

### Flow 1: Feed Publishing (Creating a Post)

When a user publishes a post, it needs to appear in all their friends' feeds.

### Flow 2: Feed Retrieval (Viewing the Feed)

When a user opens the app, they see an aggregated, sorted feed of posts from their friends.

---

## Feed Publishing: Fan-Out Strategies

The central design question: **when a user publishes a post, how do you deliver it to all their followers' feeds?**

### Option A: Fan-Out on Write (Push Model)

Pre-compute the feed at write time. When a user posts, immediately push the post to all followers' feed caches.

```
  User A posts "Hello World"
       │
       ▼
  ┌──────────────┐
  │  Post Service │ → Store post in Posts DB
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  Fan-out     │ → Query User A's friend list
  │  Service     │ → For each friend:
  └──────┬───────┘     → Append post to friend's feed cache
         │
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
  [Feed    [Feed    [Feed    [Feed
   Cache    Cache    Cache    Cache
   User B]  User C]  User D]  User E]
```

| Pros | Cons |
|------|------|
| Feed retrieval is fast (pre-computed) | Slow for users with many followers (celebrities) |
| Real-time — feed updates immediately on write | Wastes resources for inactive users who may never read |
| Simple feed read path | High write amplification |

### Option B: Fan-Out on Read (Pull Model)

Don't pre-compute. When a user requests their feed, query all friends' recent posts on the fly.

```
  User B opens feed
       │
       ▼
  ┌──────────────┐
  │  Feed Service │ → Get User B's friend list
  │               │ → For each friend:
  │               │     → Fetch recent posts
  │               │ → Merge, sort, return top N
  └──────────────┘
```

| Pros | Cons |
|------|------|
| No write amplification | Slow feed retrieval (many DB queries at read time) |
| No wasted computation for inactive users | Can't serve feed from cache — must compute each time |
| Good for users with many followers | High read latency under load |

### Option C: Hybrid Approach (Recommended)

Combine both strategies based on the user's follower count:

```
  User posts:
    ├── User has < 5,000 followers (normal user)
    │   → Fan-out on write (push to all followers' feed caches)
    │
    └── User has > 5,000 followers (celebrity)
        → DON'T fan out on write
        → Store post; fetch on read when follower views feed
```

**Facebook and Twitter** use this hybrid approach. Normal users get push-based feeds. Celebrity posts are pulled when the viewer requests their feed, then merged with the pre-computed cache.

```
  User B views feed:
    1. Fetch pre-computed feed cache (posts from normal friends)
    2. Fetch recent posts from celebrities B follows
    3. Merge and rank
    4. Return top N posts
```

---

## High-Level Architecture

```
  ┌──────────────────────────────────────────────────────────┐
  │                        Clients                            │
  └──────┬─────────────────────────────────┬─────────────────┘
         │ POST /feed/publish              │ GET /feed
         ▼                                 ▼
  ┌──────────────┐                  ┌──────────────┐
  │  Post        │                  │  Feed        │
  │  Service     │                  │  Service     │
  └──────┬───────┘                  └──────┬───────┘
         │                                 │
    ┌────┴────┐                      ┌─────┴─────┐
    ▼         ▼                      ▼           ▼
  ┌─────┐ ┌──────────┐         ┌────────┐ ┌──────────┐
  │Post │ │ Fan-out  │         │ Feed   │ │ Post     │
  │ DB  │ │ Service  │         │ Cache  │ │ DB       │
  └─────┘ └────┬─────┘         │(Redis) │ │          │
               │                └────────┘ └──────────┘
               ▼
         ┌──────────┐
         │ Feed     │
         │ Cache    │
         │ (Redis)  │
         └──────────┘
```

### Feed Cache Structure (Redis)

```
  Key: feed:{user_id}
  Value: Sorted Set of post IDs, scored by timestamp
  
  feed:user_123 = {
    post_789: 1710500000,   (timestamp as score)
    post_456: 1710499000,
    post_123: 1710498000,
    ...
  }
  
  Keep only the latest 1,000-2,000 posts per user
  Older posts: query the database on demand
```

---

## Feed Retrieval Flow

```
  1. Client: GET /v1/feed?user_id=123&cursor=<last_post_id>&page_size=20
  
  2. Feed Service:
     a. Fetch pre-computed feed from Redis (feed:123)
     b. Fetch celebrity posts (pull model) if applicable
     c. Merge and sort by timestamp (or ranking score)
     d. Apply pagination (cursor-based)
     e. Hydrate post IDs with full post data:
        - Post content, media URLs
        - Author profile (name, avatar)
        - Like count, comment count
        - Whether current user has liked the post
     f. Return paginated feed
```

### Pagination: Cursor-Based vs Offset-Based

| Approach | How | Pros | Cons |
|----------|-----|------|------|
| **Offset** | `?page=3&size=20` | Simple | Inconsistent with new posts (skips or duplicates) |
| **Cursor** | `?cursor=post_789&size=20` | Stable with real-time updates | Slightly more complex |

**News feeds should use cursor-based pagination** because new posts are constantly added at the top. Offset-based pagination would show duplicates as posts shift positions.

---

## Feed Ranking

Instead of pure reverse chronological order, modern feeds use ranking algorithms:

### Ranking Signals

| Signal | Weight | Example |
|--------|--------|---------|
| **Affinity** | High | How often you interact with the author |
| **Content type** | Medium | Images/videos rank higher than text |
| **Recency** | High | Newer posts rank higher |
| **Engagement** | Medium | Posts with more likes/comments rank higher |
| **Creator profile** | Low | Verified accounts, professional creators |

### Simple Ranking Formula

```
  Score = Affinity × TypeWeight × TimeDecay × (1 + log(Engagement))
  
  Where:
    Affinity = frequency of interaction with author (0-1)
    TypeWeight = 1.0 (text), 1.5 (image), 2.0 (video)
    TimeDecay = 1 / (1 + hours_since_posted)
    Engagement = likes + comments + shares
```

In production, this is replaced by ML models (Facebook's EdgeRank → News Feed Ranking model).

---

## Caching Strategy

Multiple cache layers for different data:

| Cache | What | TTL | Size |
|-------|------|-----|------|
| **Feed cache** | Pre-computed list of post IDs per user | N/A (updated on write) | ~10 KB per user |
| **Post content cache** | Full post data (text, media URLs) | 24 hours | ~2 KB per post |
| **Social graph cache** | User's friend list | 1 hour | ~40 KB per user (5K friends × 8 bytes) |
| **User profile cache** | Name, avatar, bio | 1 hour | ~1 KB per user |
| **Counters cache** | Like count, comment count | 30 seconds | ~50 bytes per post |

---

## Media Handling

Posts with images/videos require special handling:

```
  1. Client uploads media to CDN (direct upload via pre-signed URL)
  2. CDN returns media URL
  3. Client creates post with media URL reference
  4. When rendering feed, client loads media from CDN
```

**Benefits**: Media never goes through your application servers. CDN handles delivery, caching, and edge distribution.

---

## Interview Cheat Sheet

**Q: How would you design a news feed system?**
> Two main flows: publishing and retrieval. For publishing, use a hybrid fan-out approach — push (fan-out on write) for normal users and pull (fan-out on read) for celebrities with many followers. For retrieval, fetch from pre-computed feed cache (Redis sorted set), merge with celebrity posts, rank, and paginate. Use cursor-based pagination for stability with real-time updates.

**Q: Explain fan-out on write vs fan-out on read.**
> Fan-out on write: when a user posts, immediately push the post to all followers' feed caches. Fast reads but slow writes for users with many followers. Fan-out on read: compute the feed on demand by fetching recent posts from all friends. No write amplification but slower reads. The hybrid approach uses push for normal users and pull for celebrities — the best of both worlds.

**Q: How do you handle the celebrity problem?**
> Celebrities with millions of followers make fan-out on write impractical (millions of cache writes per post). Instead, store celebrity posts without fan-out. When a user views their feed, fetch the pre-computed cache (non-celebrity posts) and separately fetch recent posts from celebrities they follow, then merge and rank. This bounds the write amplification regardless of follower count.

**Q: How do you rank the news feed?**
> Use a combination of signals: affinity (interaction frequency with the author), recency (time decay), engagement (likes, comments, shares), and content type. In production, this is an ML model trained on user engagement data. Start with a simple weighted formula and iterate. The ranking model runs when the feed is retrieved, scoring and sorting the merged posts.

**Q: How do you store the feed?**
> Redis sorted sets — key is user_id, members are post_ids, scores are timestamps. Keep the latest 1,000-2,000 posts per user. Older posts are fetched from the database on demand. When a new post is fan-out pushed, it's added to each follower's sorted set with ZADD. When the set exceeds the limit, the oldest entries are trimmed with ZREMRANGEBYRANK.
