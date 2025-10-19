import { useMemo } from 'react';
import type { Venue } from '@/types';
import { Drawer } from '@mantine/core';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef, //if using TypeScript (optional, but recommended)
} from 'mantine-react-table';
import { useDisclosure } from '@mantine/hooks';
import { supabase } from '@/data/supabase';

export function VenuesTable({ venues }: { venues: Venue[] }) {

  const [opened, { open, close }] = useDisclosure(false);
  const columns = useMemo<MRT_ColumnDef<Venue>[]>(
    () => [
      {
        header: 'Name',
        sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
        accessorFn: (originalRow) => <span dangerouslySetInnerHTML={{ __html: originalRow.name }} />, //alternate way
        id: 'name', //id required if you use accessorFn instead of accessorKey
      },
      {
        // accessorKey: 'name', //simple recommended way to define a column
        header: 'Geo Location',
        accessorFn: (originalRow) =>  originalRow.lat && originalRow.long ? `(${originalRow.lat}, ${originalRow.long})` : '-',
        id: 'location', //id required if you use accessorFn instead of accessorKey
      },
      {
        header: 'Image',
        accessorFn: (originalRow) => getImageTag(originalRow.image_ref, 'venue-images'),
        id: 'image',
      }
    ],
    [],
  );

  function getImageUrl(imageRef: string | null, bucket: string) {
    if (!imageRef) return null;
    const { data } = supabase.storage.from(bucket).getPublicUrl(imageRef);
    console.dir(data);  
    return data?.publicUrl;
  }

  function getImageTag(imageRef: string | null, bucket: string) {
    console.log(`${imageRef}, ${bucket}`);
    const url = getImageUrl(imageRef, bucket);
    if (!url) return '-';
    return <img src={url} alt="Venue Image" style={{ maxWidth: '20px', maxHeight: '20px' }} />;
  }

  const table = useMantineReactTable({
    columns,
    data: venues,
    enableGlobalFilter: true,
    enableFilters: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    initialState: { density: 'xs', pagination: { pageSize: 10, pageIndex: 0 } },
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

  console.dir(venues);

  //note: you can also pass table options as props directly to <MantineReactTable /> instead of using useMantineReactTable
  //but that is not recommended and will likely be deprecated in the future
  return <><MantineReactTable table={table} />
    <Drawer position="right" size="xl" opened={opened} onClose={close}>
      {/* Drawer content */}
    </Drawer>
  </>;
}
