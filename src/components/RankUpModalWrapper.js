import React from 'react';
import RankUpModal from '../components/shared/RankUpModal';

export default function RankUpModalWrapper({ pendingRankUp, onDismiss }) {
  return (
    <RankUpModal
      rank={pendingRankUp}
      visible={!!pendingRankUp}
      onDismiss={onDismiss}
    />
  );
}