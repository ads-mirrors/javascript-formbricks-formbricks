import { SlackWrapper } from "@/app/(app)/environments/[environmentId]/integrations/slack/components/SlackWrapper";
import { getProjectPermissionByUserId } from "@/modules/ee/teams/lib/roles";
import { getTeamPermissionFlags } from "@/modules/ee/teams/utils/teams";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getAttributeClasses } from "@formbricks/lib/attributeClass/service";
import { authOptions } from "@formbricks/lib/authOptions";
import { SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, WEBAPP_URL } from "@formbricks/lib/constants";
import { getEnvironment } from "@formbricks/lib/environment/service";
import { getIntegrationByType } from "@formbricks/lib/integration/service";
import { getMembershipByUserIdOrganizationId } from "@formbricks/lib/membership/service";
import { getAccessFlags } from "@formbricks/lib/membership/utils";
import { getProjectByEnvironmentId } from "@formbricks/lib/project/service";
import { getSurveys } from "@formbricks/lib/survey/service";
import { findMatchingLocale } from "@formbricks/lib/utils/locale";
import { TIntegrationSlack } from "@formbricks/types/integration/slack";
import { GoBackButton } from "@formbricks/ui/components/GoBackButton";
import { PageContentWrapper } from "@formbricks/ui/components/PageContentWrapper";
import { PageHeader } from "@formbricks/ui/components/PageHeader";

const Page = async (props) => {
  const params = await props.params;
  const isEnabled = !!(SLACK_CLIENT_ID && SLACK_CLIENT_SECRET);
  const t = await getTranslations();
  const [session, surveys, slackIntegration, environment, attributeClasses] = await Promise.all([
    getServerSession(authOptions),
    getSurveys(params.environmentId),
    getIntegrationByType(params.environmentId, "slack"),
    getEnvironment(params.environmentId),
    getAttributeClasses(params.environmentId),
  ]);

  if (!session) {
    throw new Error(t("common.session_not_found"));
  }

  if (!environment) {
    throw new Error(t("common.environment_not_found"));
  }

  const project = await getProjectByEnvironmentId(params.environmentId);
  if (!project) {
    throw new Error(t("common.project_not_found"));
  }

  const locale = await findMatchingLocale();

  const currentUserMembership = await getMembershipByUserIdOrganizationId(
    session?.user.id,
    project.organizationId
  );
  const { isMember } = getAccessFlags(currentUserMembership?.role);

  const projectPermission = await getProjectPermissionByUserId(session?.user.id, environment?.projectId);

  const { hasReadAccess } = getTeamPermissionFlags(projectPermission);

  const isReadOnly = isMember && hasReadAccess;

  if (isReadOnly) {
    redirect("./");
  }

  return (
    <PageContentWrapper>
      <GoBackButton url={`${WEBAPP_URL}/environments/${params.environmentId}/integrations`} />
      <PageHeader pageTitle={t("environments.integrations.slack.slack_integration")} />
      <div className="h-[75vh] w-full">
        <SlackWrapper
          isEnabled={isEnabled}
          environment={environment}
          surveys={surveys}
          slackIntegration={slackIntegration as TIntegrationSlack}
          webAppUrl={WEBAPP_URL}
          attributeClasses={attributeClasses}
          locale={locale}
        />
      </div>
    </PageContentWrapper>
  );
};

export default Page;
