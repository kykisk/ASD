import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { CollaborationService } from './collaboration.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller()
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Post('families/:familyId/roles')
  async assignRole(
    @CurrentUser() user: { id: string },
    @Param('familyId') familyId: string,
    @Body()
    body: {
      assignedTo: string;
      childId?: string;
      title: string;
      description?: string;
      date: string;
    },
  ) {
    return this.collaborationService.assignRole(familyId, user.id, body);
  }

  @Get('families/:familyId/roles')
  async getRoleAssignments(
    @CurrentUser() user: { id: string },
    @Param('familyId') familyId: string,
    @Query('date') date: string,
  ) {
    return this.collaborationService.getRoleAssignments(familyId, date);
  }

  @Patch('roles/:id/complete')
  async completeRole(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.collaborationService.completeRole(id, user.id);
  }

  @Post('activity-logs/:activityLogId/comments')
  async addComment(
    @CurrentUser() user: { id: string },
    @Param('activityLogId') activityLogId: string,
    @Body() body: { content: string },
  ) {
    return this.collaborationService.addComment(activityLogId, user.id, body.content);
  }

  @Get('activity-logs/:activityLogId/comments')
  async getComments(
    @CurrentUser() user: { id: string },
    @Param('activityLogId') activityLogId: string,
  ) {
    return this.collaborationService.getComments(activityLogId, user.id);
  }

  @Delete('activity-comments/:commentId')
  async deleteComment(@CurrentUser() user: { id: string }, @Param('commentId') commentId: string) {
    return this.collaborationService.deleteComment(commentId, user.id);
  }
}
