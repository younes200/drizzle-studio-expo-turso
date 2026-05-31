import { useDevToolsPluginClient } from 'expo/devtools';
import { useEffect } from 'react';
function bindParams(params) {
    return params?.length ? [params] : [];
}
function formatRows(rows, arrayMode) {
    return arrayMode ? rows.map((row) => Object.values(row)) : rows;
}
export function useDrizzleStudio(db) {
    const client = useDevToolsPluginClient('expo-drizzle-studio-plugin');
    const queryFn = (db, client) => async (e) => {
        const statement = db.prepare(e.sql);
        try {
            const rows = await statement.all(...bindParams(e.params));
            client.sendMessage(`query-${e.id}`, formatRows(rows, e.arrayMode));
        }
        catch (error) {
            client.sendMessage(`query-${e.id}`, { error: error instanceof Error ? error.message : String(error) });
        }
        finally {
            await statement.finalize();
        }
    };
    const transactionFn = (db, client) => async (e) => {
        const results = [];
        try {
            await db.transaction(async () => {
                for (const query of e.queries) {
                    const statement = db.prepare(query.sql);
                    try {
                        results.push(await statement.all(...bindParams(query.params)));
                    }
                    finally {
                        await statement.finalize();
                    }
                }
            });
        }
        catch (error) {
            results.push({ error: error instanceof Error ? error.message : String(error) });
        }
        client.sendMessage(`transaction-${e.id}`, results);
    };
    useEffect(() => {
        if (!client || !db) {
            return;
        }
        const subscriptions = [];
        subscriptions.push(client.addMessageListener('query', queryFn(db, client)));
        subscriptions.push(client.addMessageListener('transaction', transactionFn(db, client)));
        return () => {
            for (const subscription of subscriptions) {
                subscription.remove();
            }
        };
    }, [client, db]);
}
//# sourceMappingURL=useDrizzleStudio.js.map