import { useMemo } from 'react';
import type { Profile, Tag } from '@/types';
import { Drawer, Group } from '@mantine/core';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef, //if using TypeScript (optional, but recommended)
} from 'mantine-react-table';
import { useNavigate } from '@tanstack/react-router';
import { lookupProfileName } from '@/utils/lookup-profile-name';
import { CreateUpdateByTooltip } from './CreateUpdateByTooltip';

export function TagsTable({ tags, initialTagId, profiles }: { tags: Tag[], profiles: Profile[], initialTagId?: string }) {
  const navigate = useNavigate();
  const opened = !!initialTagId;
  const columns = useMemo<MRT_ColumnDef<Tag>[]>(
    () => [
      {
        header: 'Name',
        sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
        accessorKey: 'name',
        id: 'name', //id required if you use accessorFn instead of accessorKey
      },
      {
        header: 'Created / Updated',
        accessorFn: (originalRow) => `${lookupProfileName(profiles, originalRow.created_by)} / ${lookupProfileName(profiles, originalRow.updated_by)}`,
        id: 'created_updated_by',
        Cell: ({ row }) =>
          <CreateUpdateByTooltip
            createdAt={row.original.created_at}
            createdBy={row.original.created_by}
            updatedAt={row.original.updated_at}
            updatedBy={row.original.updated_by}
            profiles={profiles}
          />,
      }
    ],
    [],
  );

  const table = useMantineReactTable({
    columns,
    data: tags,
    enableGlobalFilter: true,
    enableFilters: true,
    positionGlobalFilter: 'left',
    enableColumnFilters: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    initialState: { density: 'xs', pagination: { pageSize: 10, pageIndex: 0 }, showGlobalFilter: true, },
    sortDescFirst: true,
    mantineTableBodyRowProps: ({ }) => ({
      // onClick: () => {
      //   navigate({ to: '/tags', search: { tagId: row.original.id.toString() } });
      // },
      sx: {
        cursor: 'pointer', //you might want to change the cursor too when adding an onClick
      },
    }),
  });

  //note: you can also pass table options as props directly to <MantineReactTable /> instead of using useMantineReactTable
  //but that is not recommended and will likely be deprecated in the future
  return <>
    <Group position="apart" mb="md">
      <div className="ml-4 text-2xl font-bold text-black">Tags</div>
    </Group>

    <MantineReactTable table={table} />
    <Drawer position="right" size="xl" opened={opened} onClose={() => navigate({ to: '/tags' })}>
      {/* Drawer content */}
    </Drawer>
  </>;
}
