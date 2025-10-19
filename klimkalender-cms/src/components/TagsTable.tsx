import { useMemo } from 'react';
import type { Tag } from '@/types';
import { Drawer } from '@mantine/core';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef, //if using TypeScript (optional, but recommended)
} from 'mantine-react-table';
import { useDisclosure } from '@mantine/hooks';

export function TagsTable({ tags }: { tags: Tag[] }) {

  const [opened, { open, close }] = useDisclosure(false);
  const columns = useMemo<MRT_ColumnDef<Tag>[]>(
    () => [
      {
        header: 'Name',
        sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
        accessorKey: 'name',
        id: 'name', //id required if you use accessorFn instead of accessorKey
      },
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
    initialState: { density: 'xs', pagination: { pageSize: 10, pageIndex: 0 } , showGlobalFilter: true,},
    sortDescFirst: true,
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: (event) => {
        open();
        console.info(event, row.id);
      },
      sx: {
        cursor: 'pointer', //you might want to change the cursor too when adding an onClick
      },
    }),
  });

  //note: you can also pass table options as props directly to <MantineReactTable /> instead of using useMantineReactTable
  //but that is not recommended and will likely be deprecated in the future
  return <><MantineReactTable table={table} />
    <Drawer position="right" size="xl" opened={opened} onClose={close}>
      {/* Drawer content */}
    </Drawer>
  </>;
}
