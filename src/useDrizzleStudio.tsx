import { type Database, type BindParams, type Row, type SQLiteValue } from '@tursodatabase/sync-react-native';
import type { DevToolsPluginClient, EventSubscription } from 'expo/devtools';
import { useDevToolsPluginClient } from 'expo/devtools';
import { useEffect } from 'react';

function bindParams(params?: SQLiteValue[]): BindParams[] {
  return params?.length ? [params] : [];
}

function formatRows(rows: Row[], arrayMode: boolean) {
  return arrayMode ? rows.map((row) => Object.values(row)) : rows;
}

export function useDrizzleStudio(db: Database | null) {
  const client = useDevToolsPluginClient('expo-drizzle-studio-plugin');

  const queryFn =
    (db: Database, client: DevToolsPluginClient) =>
    async (e: { sql: string; params?: SQLiteValue[]; arrayMode: boolean; id: string }) => {
      const statement = db.prepare(e.sql);
      try {
        const rows = await statement.all(...bindParams(e.params));
        client.sendMessage(`query-${e.id}`, formatRows(rows, e.arrayMode));
      } catch (error) {
        client.sendMessage(`query-${e.id}`, { error: error instanceof Error ? error.message : String(error) });
      } finally {
        await statement.finalize();
      }
    };

  const transactionFn =
    (db: Database, client: DevToolsPluginClient) =>
    async (e: { queries: { sql: string; params?: SQLiteValue[] }[]; id: string }) => {
      const results: unknown[] = [];
      try {
        await db.transaction(async () => {
          for (const query of e.queries) {
            const statement = db.prepare(query.sql);
            try {
              results.push(await statement.all(...bindParams(query.params)));
            } finally {
              await statement.finalize();
            }
          }
        });
      } catch (error) {
        results.push({ error: error instanceof Error ? error.message : String(error) });
      }
      client.sendMessage(`transaction-${e.id}`, results);
    };

  useEffect(() => {
    if (!client || !db) {
      return;
    }

    const subscriptions: EventSubscription[] = [];

    subscriptions.push(client.addMessageListener('query', queryFn(db, client)));
    subscriptions.push(client.addMessageListener('transaction', transactionFn(db, client)));

    return () => {
      for (const subscription of subscriptions) {
        subscription.remove();
      }
    };
  }, [client, db]);
}
