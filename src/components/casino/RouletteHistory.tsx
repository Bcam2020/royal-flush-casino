import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import type { HistoryEntry } from '../../games/roulette/types';
import { currentStreak, hotNumbers, coldNumbers } from '../../games/roulette/engine';

interface RouletteHistoryProps {
  history: HistoryEntry[];
}

// ---------------------------------------------------------------------------
// Mini number pill
// ---------------------------------------------------------------------------

const NumberPill: React.FC<{ entry: HistoryEntry; size?: 'sm' | 'md' }> = ({
  entry,
  size = 'sm',
}) => {
  const dim = size === 'md' ? 36 : 28;
  const fs = size === 'md' ? Typography.sizeSm : Typography.size2xs;
  const bg =
    entry.color === 'green'
      ? Colors.win
      : entry.color === 'red'
      ? Colors.suitRed
      : Colors.suitBlack;

  return (
    <View
      style={[
        styles.pill,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: bg,
        },
      ]}
    >
      <Text style={[styles.pillText, { fontSize: fs }]}>{entry.number}</Text>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Stats bar
// ---------------------------------------------------------------------------

const StatsBar: React.FC<{ history: HistoryEntry[] }> = ({ history }) => {
  if (history.length === 0) return null;

  const reds = history.filter((h) => h.color === 'red').length;
  const blacks = history.filter((h) => h.color === 'black').length;
  const greens = history.filter((h) => h.color === 'green').length;
  const streak = currentStreak(history);
  const hot = hotNumbers(history, 3);
  const cold = coldNumbers(history, 3);

  return (
    <View style={styles.statsContainer}>
      {/* Color counts */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: Colors.suitRed }]} />
          <Text style={styles.statLabel}>{reds}</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: Colors.suitBlack }]} />
          <Text style={styles.statLabel}>{blacks}</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: Colors.win }]} />
          <Text style={styles.statLabel}>{greens}</Text>
        </View>
        {streak && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>
              {streak.label === 'red' ? '🔴' : streak.label === 'black' ? '⚫' : '🟢'}×{streak.count}
            </Text>
          </View>
        )}
      </View>

      {/* Hot / cold */}
      <View style={styles.statsRow}>
        <Text style={styles.statCaption}>Hot: </Text>
        {hot.map((n) => (
          <View key={`h${n}`} style={[styles.miniPill, { backgroundColor: '#ff6b00' }]}>
            <Text style={styles.miniPillText}>{n}</Text>
          </View>
        ))}
        <Text style={[styles.statCaption, { marginLeft: Spacing.sm }]}>Cold: </Text>
        {cold.map((n) => (
          <View key={`c${n}`} style={[styles.miniPill, { backgroundColor: Colors.info }]}>
            <Text style={styles.miniPillText}>{n}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const RouletteHistory: React.FC<RouletteHistoryProps> = ({ history }) => {
  const [expanded, setExpanded] = useState(false);
  const recent = history.slice(0, 10);

  return (
    <View style={styles.container}>
      {/* Last-results strip */}
      <TouchableOpacity
        style={styles.strip}
        onPress={() => setExpanded((p) => !p)}
        activeOpacity={0.8}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripContent}
          scrollEnabled={false}
        >
          {recent.length === 0 ? (
            <Text style={styles.emptyText}>No spins yet</Text>
          ) : (
            recent.map((entry) => (
              <NumberPill key={entry.id} entry={entry} />
            ))
          )}
        </ScrollView>
        <Text style={styles.expandChevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Expanded panel */}
      {expanded && (
        <View style={styles.panel}>
          <StatsBar history={history} />
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {history.map((entry, i) => (
              <View key={entry.id} style={styles.historyRow}>
                <Text style={styles.historyIndex}>{i + 1}</Text>
                <NumberPill entry={entry} size="md" />
                <Text
                  style={[
                    styles.historyPnl,
                    { color: entry.netPnl >= 0 ? Colors.win : Colors.lose },
                  ]}
                >
                  {entry.netPnl >= 0 ? '+' : ''}
                  {entry.netPnl < 0
                    ? `-$${Math.abs(entry.netPnl).toLocaleString()}`
                    : `$${entry.netPnl.toLocaleString()}`}
                </Text>
                <Text style={styles.historyBalance}>
                  ${entry.balance.toLocaleString()}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default RouletteHistory;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  stripContent: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  expandChevron: {
    color: Colors.accentGold,
    fontSize: Typography.size2xs,
    marginLeft: Spacing.xs,
  },
  emptyText: {
    color: Colors.textPrimary,
    opacity: 0.4,
    fontSize: Typography.size2xs,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pillText: {
    color: '#fff',
    fontWeight: '700',
  },
  panel: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    padding: Spacing.sm,
  },
  scroll: {
    maxHeight: 200,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: Spacing.sm,
  },
  historyIndex: {
    color: Colors.textPrimary,
    opacity: 0.4,
    fontSize: Typography.size2xs,
    width: 20,
    textAlign: 'right',
  },
  historyPnl: {
    fontSize: Typography.sizeSm,
    fontWeight: '600',
    flex: 1,
  },
  historyBalance: {
    color: Colors.textPrimary,
    fontSize: Typography.size2xs,
    opacity: 0.6,
  },
  statsContainer: {
    marginBottom: Spacing.sm,
    gap: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.size2xs,
    opacity: 0.8,
  },
  statCaption: {
    color: Colors.textPrimary,
    fontSize: Typography.size2xs,
    opacity: 0.5,
  },
  miniPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPillText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});
