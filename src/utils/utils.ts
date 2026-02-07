// Shared utility functions for the stat bot

export const getRankMedal = (rank: number): string => {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return '📊';
  }
};

export const getStatEmoji = (statType: string): string => {
  const emojiMap: { [key: string]: string } = {
    malewife: '👨‍🍳',
    manipulate: '😈',
    mansplain: '🤓',
    gaslight: '🔥',
    gatekeep: '🐠',
    girlboss: '💅',
  };

  return emojiMap[statType] || '📈';
};

export const statChoices = [
  { name: 'malewife', value: 'malewife' },
  { name: 'manipulate', value: 'manipulate' },
  { name: 'mansplain', value: 'mansplain' },
  { name: 'gaslight', value: 'gaslight' },
  { name: 'gatekeep', value: 'gatekeep' },
  { name: 'girlboss', value: 'girlboss' },
];

export const operationChoices = [
  { name: 'add', value: 'add' },
  { name: 'subtract', value: 'subtract' },
];
