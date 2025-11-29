import { Popover, ActionIcon, Stack, Text, Group } from '@mantine/core';
import { AlertTriangle } from 'lucide-react';

interface FieldChangePopoverProps {
  currentValue: string | null | undefined;
  previousValue: string | null | undefined;
  hasChanged: boolean;
}

export function FieldChangePopover({ currentValue, previousValue, hasChanged }: FieldChangePopoverProps) {
  if (!hasChanged) {
    return null;
  }

  return (
    <Popover width={400} position="bottom" withArrow shadow="md">
      <Popover.Target>
        <ActionIcon size="xs" color='red'>
          <AlertTriangle size={12} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack spacing="xs">
          <Text size="sm" weight={500}>Value Changed</Text>
          <Group spacing="xs">
            <Text size="xs" color="dimmed">Previous:</Text>
            <Text size="xs" style={{ textDecoration: 'line-through', color: 'red' }}>
              {previousValue || 'N/A'}
            </Text>
          </Group>
          <Group spacing="xs">
            <Text size="xs" color="dimmed">Current:</Text>
            <Text size="xs" style={{ color: 'green' }}>
              {currentValue || 'N/A'}
            </Text>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
