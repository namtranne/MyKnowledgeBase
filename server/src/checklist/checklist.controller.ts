import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { GradeItemDto, UpsertItemDto } from './dto/checklist.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('checklist')
@UseGuards(JwtAuthGuard)
export class ChecklistController {
  constructor(private checklist: ChecklistService) {}

  // GET /api/checklist -> all item states grouped by category
  @Get()
  getAll(@GetUser('userId') userId: string) {
    return this.checklist.getAll(userId);
  }

  // PUT /api/checklist/item/:itemId -> upsert check state and/or answer
  @Put('item/:itemId')
  upsert(
    @GetUser('userId') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpsertItemDto,
  ) {
    return this.checklist.upsertItem(userId, itemId, dto);
  }

  // POST /api/checklist/item/:itemId/grade -> AI feedback (also saves the answer)
  @Post('item/:itemId/grade')
  grade(
    @GetUser('userId') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: GradeItemDto,
  ) {
    return this.checklist.gradeItem(userId, itemId, dto);
  }

    // DELETE /api/checklist/item/:itemId -> remove one item's state (custom questions)
  @Delete('item/:itemId')
  removeItem(@GetUser('userId') userId: string, @Param('itemId') itemId: string) {
    return this.checklist.removeItem(userId, itemId);
  }

    // DELETE /api/checklist/category/:categoryId -> reset a category
  @Delete('category/:categoryId')
  reset(
    @GetUser('userId') userId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.checklist.resetCategory(userId, categoryId);
  }
}
