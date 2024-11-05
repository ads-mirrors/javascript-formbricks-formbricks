"use client";

import { deleteTeamAction } from "@/modules/ee/teams/team-details/actions";
import { TTeam } from "@/modules/ee/teams/team-details/types/teams";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { getAccessFlags } from "@formbricks/lib/membership/utils";
import { TOrganizationRole } from "@formbricks/types/memberships";
import { Button } from "@formbricks/ui/components/Button";
import { DeleteDialog } from "@formbricks/ui/components/DeleteDialog";

interface DeleteTeamProps {
  teamId: TTeam["id"];
  membershipRole?: TOrganizationRole;
}

export const DeleteTeam = ({ teamId, membershipRole }: DeleteTeamProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();

  const handleDeleteTeam = async () => {
    setIsDeleting(true);

    const deleteTeamActionResponse = await deleteTeamAction({ teamId });
    if (deleteTeamActionResponse?.data) {
      toast.success("Team deleted successfully.");
      router.push("./");
    } else {
      toast.error("Error deleting team. Please try again.");
    }

    setIsDeleteDialogOpen(false);
    setIsDeleting(false);
  };

  const { isMember } = getAccessFlags(membershipRole);

  const isDeleteDisabled = isMember;

  return (
    <div>
      {isDeleteDisabled ? (
        <p className="text-sm text-red-700">Only organization owners and managers can access this setting.</p>
      ) : (
        <div>
          <p className="text-sm text-slate-900">
            This action cannot be undone. If it&apos;s gone, it&apos;s gone.
          </p>
          <Button
            size="sm"
            disabled={isDeleteDisabled}
            variant="warn"
            className={`mt-4 ${isDeleteDisabled ? "ring-grey-500 ring-1 ring-offset-1" : ""}`}
            onClick={() => setIsDeleteDialogOpen(true)}>
            Delete
          </Button>
        </div>
      )}

      {isDeleteDialogOpen && (
        <DeleteDialog
          open={isDeleteDialogOpen}
          setOpen={setIsDeleteDialogOpen}
          deleteWhat="team"
          text="Are you sure you want to delete this team? This also removes the access to all the products and surveys associated with this team."
          onDelete={handleDeleteTeam}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};
