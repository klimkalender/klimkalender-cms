import { useMemo } from 'react';
import type { Organizer, Profile } from '@/types';
import { Drawer, Group } from '@mantine/core';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef, //if using TypeScript (optional, but recommended)
} from 'mantine-react-table';
import { getImageTag } from '@/data/supabase';
import { useNavigate } from '@tanstack/react-router';
import { lookupProfileName } from '@/utils/lookup-profile-name';
import { CreateUpdateByTooltip } from './CreateUpdateByTooltip';

export function OrganizersTable({ organizers, profiles, initialOrganizerId }: { organizers: Organizer[], profiles: Profile[], initialOrganizerId?: string }) {
  const navigate = useNavigate();
  const opened = !!initialOrganizerId;
  const columns = useMemo<MRT_ColumnDef<Organizer>[]>(
    () => [
      {
        header: 'Name',
        sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
        accessorKey: 'name',
        id: 'name', //id required if you use accessorFn instead of accessorKey
      },
      {
        header: 'Image',
        accessorFn: (originalRow) => getImageTag(originalRow.image_ref, 'organizer-images'),
        id: 'image',
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
    data: organizers,
    enableGlobalFilter: true,
    enableFilters: true,
    positionGlobalFilter: 'left',
    enableColumnFilters: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    initialState: { density: 'xs', pagination: { pageSize: 10, pageIndex: 0 }, showGlobalFilter: true, },
    sortDescFirst: true,
    mantineTableBodyRowProps: ({  }) => ({
      // onClick: () => {
      //   navigate({ to: '/organizers', search: { organizerId: row.original.id.toString() } });
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
      <div className="ml-4 text-2xl font-bold text-black">Organizers</div>
    </Group>
    <MantineReactTable table={table} />
    <Drawer position="right" size="xl" opened={opened} onClose={() => navigate({ to: '/organizers' })}>
      {/* Drawer content */}
    </Drawer>
  </>;
}
