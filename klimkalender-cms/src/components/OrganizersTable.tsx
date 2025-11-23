import { useMemo } from 'react';
import type { Organizer } from '@/types';
import { Drawer } from '@mantine/core';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef, //if using TypeScript (optional, but recommended)
} from 'mantine-react-table';
import { getImageTag } from '@/data/supabase';
import { useNavigate } from '@tanstack/react-router';

export function OrganizersTable({ organizers, initialOrganizerId }: { organizers: Organizer[], initialOrganizerId?: string }) {
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
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        navigate({ to: '/organizers', search: { organizerId: row.original.id.toString() } });
      },
      sx: {
        cursor: 'pointer', //you might want to change the cursor too when adding an onClick
      },
    }),
  });

  //note: you can also pass table options as props directly to <MantineReactTable /> instead of using useMantineReactTable
  //but that is not recommended and will likely be deprecated in the future
  return <><MantineReactTable table={table} />
    <Drawer position="right" size="xl" opened={opened} onClose={() => navigate({ to: '/organizers' })}>
      {/* Drawer content */}
    </Drawer>
  </>;
}
