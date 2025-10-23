import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { migrateLocalStorageToSupabase, needsMigration } from '../utils/supabase/migrate-localStorage';
import { Database, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

/**
 * Migration Helper Component
 * Shows a prompt to migrate localStorage data to Supabase
 * This should only appear if there's data in localStorage that hasn't been migrated
 */
export function MigrationHelper() {
  const [showMigration, setShowMigration] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Check if migration is needed
    if (needsMigration()) {
      setShowMigration(true);
    }
  }, []);

  const handleMigrate = async () => {
    setMigrating(true);
    setResult(null);

    const migrationResult = await migrateLocalStorageToSupabase();

    if (migrationResult.success) {
      setResult({
        success: true,
        message: `Successfully migrated ${migrationResult.migratedCount} complaints to the cloud database!`,
      });
      // Hide the migration prompt after 5 seconds
      setTimeout(() => {
        setShowMigration(false);
      }, 5000);
    } else {
      setResult({
        success: false,
        message: `Migration failed: ${migrationResult.error}`,
      });
    }

    setMigrating(false);
  };

  const handleDismiss = () => {
    setShowMigration(false);
    // Mark as dismissed in localStorage so it doesn't show again this session
    sessionStorage.setItem('migration-dismissed', 'true');
  };

  if (!showMigration || sessionStorage.getItem('migration-dismissed')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="shadow-lg border-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Database Migration Available</span>
          </CardTitle>
          <CardDescription>
            We've detected complaints stored locally on this device. Migrate them to the cloud for safe, permanent storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-2">
            <Button
              onClick={handleMigrate}
              disabled={migrating || result?.success}
              className="flex-1"
            >
              {migrating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : result?.success ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Migrated
                </>
              ) : (
                'Migrate to Cloud'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              disabled={migrating}
            >
              Dismiss
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            This will transfer your local complaints to Supabase, making them accessible from any device.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
