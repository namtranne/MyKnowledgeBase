import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { UpsertItemDto } from './dto/checklist.dto';
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

  // DELETE /api/checklist/category/:categoryId -> reset a category
  @Delete('category/:categoryId')
  reset(
    @GetUser('userId') userId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.checklist.resetCategory(userId, categoryId);
  }
}
