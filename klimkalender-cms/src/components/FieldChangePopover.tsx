import { Popover, ActionIcon, Stack, Text, Code } from '@mantine/core';
import { AlertTriangle } from 'lucide-react';
import { diffWords } from 'diff';

interface FieldChangePopoverProps {
  currentValue: string | null | undefined;
  previousValue: string | null | undefined;
  hasChanged: boolean;
  shouldDisplay?: boolean;
}

export function FieldChangePopover({ currentValue, previousValue, hasChanged, shouldDisplay = true }: FieldChangePopoverProps) {
  if (!hasChanged || !shouldDisplay) {
    return null;
  }

  const oldText = previousValue || '';
  const newText = currentValue || '';
  const differences = diffWords(oldText, newText);

  return (
    <Popover width={500} position="bottom" withArrow shadow="md">
      <Popover.Target>
        <ActionIcon size="xs" color='red'>
          <AlertTriangle size={12} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack spacing="xs">
          <Text size="sm" weight={500}>Value Changed</Text>
          <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {differences.map((part, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: part.added 
                    ? '#d4edda' 
                    : part.removed 
                    ? '#f8d7da' 
                    : 'transparent',
                  color: part.added 
                    ? '#155724' 
                    : part.removed 
                    ? '#721c24' 
                    : 'inherit',
                  textDecoration: part.removed ? 'line-through' : 'none',
                }}
              >
                {part.value}
              </span>
            ))}
          </Code>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
