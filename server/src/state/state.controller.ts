import {
  Body,
  Controller,
  Delete,
  Get,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StateService } from './state.service';
import { PutStateDto } from './dto/state.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('state')
@UseGuards(JwtAuthGuard)
export class StateController {
  constructor(private state: StateService) {}

  // GET /api/state -> { [key]: value } for the signed-in user
  @Get()
  getAll(@GetUser('userId') userId: string) {
    return this.state.getAll(userId);
  }

  // PUT /api/state  { key, value }
  @Put()
  put(@GetUser('userId') userId: string, @Body() dto: PutStateDto) {
    return this.state.put(userId, dto.key, dto.value);
  }

  // DELETE /api/state?key=...
  @Delete()
  remove(@GetUser('userId') userId: string, @Query('key') key: string) {
    return this.state.remove(userId, key);
  }
}
