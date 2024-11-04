"use server";

import { checkAuthorizationUpdated } from "@/lib/utils/action-client-middleware";
import { getOrganizationIdFromTeamId } from "@/lib/utils/helper";
import {
  addTeamMembers,
  deleteTeam,
  removeTeamMember,
  updateTeamName,
  updateUserTeamRole,
} from "@/modules/ee/teams/team-details/lib/teams";
import { ZTeamRole } from "@/modules/ee/teams/team-list/types/teams";
import { z } from "zod";
import { authenticatedActionClient } from "@formbricks/lib/actionClient";
import { ZId } from "@formbricks/types/common";
import { ZTeam } from "./types/teams";

const ZUpdateTeamNameAction = z.object({
  name: ZTeam.shape.name,
  teamId: z.string(),
});

export const updateTeamNameAction = authenticatedActionClient
  .schema(ZUpdateTeamNameAction)
  .action(async ({ ctx, parsedInput }) => {
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: await getOrganizationIdFromTeamId(parsedInput.teamId),
      access: [
        {
          type: "organization",
          rules: ["team", "update"],
        },
      ],
    });

    return await updateTeamName(parsedInput.teamId, parsedInput.name);
  });

const ZDeleteTeamAction = z.object({
  teamId: ZId,
});

export const deleteTeamAction = authenticatedActionClient
  .schema(ZDeleteTeamAction)
  .action(async ({ ctx, parsedInput }) => {
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: await getOrganizationIdFromTeamId(parsedInput.teamId),
      access: [
        {
          type: "organization",
          rules: ["team", "delete"],
        },
      ],
    });

    return await deleteTeam(parsedInput.teamId);
  });

const ZUpdateUserTeamRoleAction = z.object({
  teamId: ZId,
  userId: ZId,
  role: ZTeamRole,
});

export const updateUserTeamRoleAction = authenticatedActionClient
  .schema(ZUpdateUserTeamRoleAction)
  .action(async ({ ctx, parsedInput }) => {
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: await getOrganizationIdFromTeamId(parsedInput.teamId),
      access: [
        {
          type: "organization",
          rules: ["teamMembership", "update"],
        },
        {
          type: "team",
          teamId: parsedInput.teamId,
          minPermission: "admin",
        },
      ],
    });

    return await updateUserTeamRole(parsedInput.teamId, parsedInput.userId, parsedInput.role);
  });

const ZRemoveTeamMemberAction = z.object({
  teamId: ZId,
  userId: ZId,
});

export const removeTeamMemberAction = authenticatedActionClient
  .schema(ZRemoveTeamMemberAction)
  .action(async ({ ctx, parsedInput }) => {
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: await getOrganizationIdFromTeamId(parsedInput.teamId),
      access: [
        {
          type: "organization",
          rules: ["teamMembership", "update"],
        },
        {
          type: "team",
          teamId: parsedInput.teamId,
          minPermission: "admin",
        },
      ],
    });

    return await removeTeamMember(parsedInput.teamId, parsedInput.userId);
  });

const ZAddTeamMembersAction = z.object({
  teamId: ZId,
  userIds: z.array(ZId),
});

export const addTeamMembersAction = authenticatedActionClient
  .schema(ZAddTeamMembersAction)
  .action(async ({ ctx, parsedInput }) => {
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: await getOrganizationIdFromTeamId(parsedInput.teamId),
      access: [
        {
          type: "organization",
          rules: ["teamMembership", "create"],
        },
        {
          type: "team",
          teamId: parsedInput.teamId,
          minPermission: "admin",
        },
      ],
    });

    return await addTeamMembers(parsedInput.teamId, parsedInput.userIds);
  });
