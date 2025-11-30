import { formatDate } from "@/utils/format-date";
import { lookupProfileName } from "@/utils/lookup-profile-name";
import { Tooltip } from "@mantine/core";


export function CreateUpdateByTooltip({ createdAt, createdBy, updatedAt, updatedBy, profiles }: { createdAt: string | null | undefined; createdBy: string | null | undefined; updatedAt: string | null | undefined; updatedBy: string | null | undefined; profiles: any[] }) {
  return (
          <Tooltip label={`Created: ${formatDate(createdAt)}(${lookupProfileName(profiles, createdBy)})\nUpdated: ${formatDate(updatedAt)}(${lookupProfileName(profiles, updatedBy)})`} withArrow>
            <span>{`${lookupProfileName(profiles, createdBy)} / ${lookupProfileName(profiles, updatedBy)}`}</span>
          </Tooltip>
  );
}