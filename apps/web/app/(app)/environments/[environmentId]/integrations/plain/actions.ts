"use server";

import { ENCRYPTION_KEY } from "@/lib/constants";
import { symmetricEncrypt } from "@/lib/crypto";
import { createOrUpdateIntegration, getIntegrationByType } from "@/lib/integration/service";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { getOrganizationIdFromEnvironmentId, getProjectIdFromEnvironmentId } from "@/lib/utils/helper";
import { z } from "zod";
import { ZId } from "@formbricks/types/common";
import type { TIntegrationPlainConfigData } from "@formbricks/types/integration/plain";

const ZConnectPlainIntegration = z.object({
  environmentId: ZId,
  key: z.string().min(1),
});

export const connectPlainIntegrationAction = authenticatedActionClient
  .schema(ZConnectPlainIntegration)
  .action(async ({ ctx, parsedInput }) => {
    const { environmentId, key } = parsedInput;

    const organizationId = await getOrganizationIdFromEnvironmentId(environmentId);
    const projectId = await getProjectIdFromEnvironmentId(environmentId);

    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId,
      access: [
        {
          type: "organization",
          roles: ["owner", "manager"],
        },
        {
          type: "projectTeam",
          minPermission: "readWrite",
          projectId,
        },
      ],
    });

    const encryptedAccessToken = symmetricEncrypt(key, ENCRYPTION_KEY);

    const existingIntegration = await getIntegrationByType(environmentId, "plain");
    const plainData: TIntegrationPlainConfigData[] =
      existingIntegration?.type === "plain"
        ? (existingIntegration.config.data as TIntegrationPlainConfigData[])
        : [];

    const integration = await createOrUpdateIntegration(environmentId, {
      type: "plain",
      config: {
        key: encryptedAccessToken,
        data: plainData,
      },
    });

    return {
      success: true,
      integration,
    };
  });
