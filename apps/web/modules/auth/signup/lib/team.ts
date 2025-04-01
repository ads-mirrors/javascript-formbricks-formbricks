import "server-only";
import { teamCache } from "@/lib/cache/team";
import { CreateMembershipInvite } from "@/modules/auth/signup/types/invites";
import { Prisma, Team } from "@prisma/client";
import { cache as reactCache } from "react";
import { prisma } from "@formbricks/database";
import { cache } from "@formbricks/lib/cache";
import { DEFAULT_ORGANIZATION_ID, DEFAULT_TEAM_ID } from "@formbricks/lib/constants";
import { getMembershipByUserIdOrganizationId } from "@formbricks/lib/membership/service";
import { getAccessFlags } from "@formbricks/lib/membership/utils";
import { projectCache } from "@formbricks/lib/project/cache";
import { logger } from "@formbricks/logger";
import { DatabaseError } from "@formbricks/types/errors";

export const createTeamMembership = async (invite: CreateMembershipInvite, userId: string): Promise<void> => {
  const teamIds = invite.teamIds || [];

  const userMembershipRole = invite.role;
  const { isOwner, isManager } = getAccessFlags(userMembershipRole);

  const validTeamIds: string[] = [];
  const validProjectIds: string[] = [];

  const isOwnerOrManager = isOwner || isManager;
  try {
    for (const teamId of teamIds) {
      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
          organizationId: invite.organizationId,
        },
        select: {
          projectTeams: {
            select: {
              projectId: true,
            },
          },
        },
      });

      if (team) {
        await prisma.teamUser.create({
          data: {
            teamId,
            userId,
            role: isOwnerOrManager ? "admin" : "contributor",
          },
        });

        validTeamIds.push(teamId);
        validProjectIds.push(...team.projectTeams.map((pt) => pt.projectId));
      }
    }

    for (const projectId of validProjectIds) {
      projectCache.revalidate({ id: projectId });
    }

    for (const teamId of validTeamIds) {
      teamCache.revalidate({ id: teamId });
    }

    teamCache.revalidate({ userId, organizationId: invite.organizationId });
    projectCache.revalidate({ userId, organizationId: invite.organizationId });
  } catch (error) {
    logger.error(error, `Error creating team membership ${invite.organizationId} ${userId}`);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }

    throw error;
  }
};

const getTeamByTeamIdOrganizationId = reactCache(
  async (teamId: string, organizationId: string): Promise<Team> =>
    cache(
      async () => {
        try {
          const team = await prisma.team.findUnique({
            where: {
              id: teamId,
              organizationId: organizationId,
            },
          });

          if (!team) {
            throw new Error("Team not found");
          }

          return team;
        } catch (error) {
          logger.error(error, `Team not found ${teamId} ${organizationId}`);
          throw error;
        }
      },
      [`getTeamByTeamIdOrganizationId-${teamId}-${organizationId}`],
      {
        tags: [teamCache.tag.byId(teamId), teamCache.tag.byOrganizationId(organizationId)],
      }
    )()
);

export const createDefaultTeamMembership = async (userId: string) => {
  try {
    const defaultTeamId = DEFAULT_TEAM_ID;
    const defaultOrganizationId = DEFAULT_ORGANIZATION_ID;

    if (!defaultTeamId) {
      logger.error("Default team ID not found");
      return;
    }

    if (!defaultOrganizationId) {
      logger.error("Default organization ID not found");
      return;
    }

    const defaultTeam = await getTeamByTeamIdOrganizationId(defaultTeamId, defaultOrganizationId);

    if (!defaultTeam) {
      logger.error("Default team not found");
      return;
    }

    const organizationMembership = await getMembershipByUserIdOrganizationId(
      userId,
      defaultTeam.organizationId
    );

    if (!organizationMembership) {
      logger.error("Organization membership not found");
      return;
    }

    const membershipRole = organizationMembership.role;

    await createTeamMembership(
      {
        organizationId: defaultTeam.organizationId,
        role: membershipRole,
        teamIds: [defaultTeamId],
      },
      userId
    );
  } catch (error) {
    logger.error("Error creating default team membership", error);
  }
};
