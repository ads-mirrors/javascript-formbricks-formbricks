import { ZGetFilter } from "@/modules/api/v2/types/api-filter";
import { z } from "zod";
import { ZTeam } from "@formbricks/database/zod/teams";

export const ZGetTeamsFilter = ZGetFilter.extend({
  surveyId: z.string().cuid2().optional(),
  contactId: z.string().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      return false;
    }
    return true;
  },
  {
    message: "startDate must be before endDate",
  }
);

export type TGetTeamsFilter = z.infer<typeof ZGetTeamsFilter>;

export const ZTeamInput = ZTeam.pick({
  name: true,
  organizationId: true,
});

export type TResponseInput = z.infer<typeof ZTeamInput>;
