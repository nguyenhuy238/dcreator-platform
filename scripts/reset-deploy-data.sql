-- Reset deploy business data without dropping schemas, migrations, RPCs,
-- triggers, functions, or RLS policies.
--
-- This file is intentionally guarded. The runner must set:
--   SET app.allow_deploy_data_reset = 'true';

DO $$
DECLARE
  reset_tables text[] := ARRAY[
    'ProofReview',
    'CreatorMission',
    'MissionSubmission',
    'MissionApplication',
    'FulfillmentOrder',
    'InventoryBatch',
    'ProductSubmission',
    'AnalyticsDaily',
    'AnalyticsEvent',
    'RewardClaim',
    'Contribution',
    'PaymentOrder',
    'PaymentTransaction',
    'NPointTopupRequest',
    'PayoutRequest',
    'WalletTransaction',
    'WalletLedger',
    'Wallet',
    'Notification',
    'SupportTicketComment',
    'SupportTicket',
    'InternalNote',
    'RiskFlag',
    'AuditLog',
    'Mission',
    'Reward',
    'Campaign',
    'BrandCampaignRequest',
    'BrandInventoryBatch',
    'BrandProduct',
    'BrandSubscription',
    'BrandMember',
    'Brand',
    'BrandApplication',
    'CreatorSocialLink',
    'CreatorProfile',
    'CreatorApplication',
    'RoleRequest',
    'AccountSettings',
    'AuthSession',
    'Profile',
    'AccountRole'
  ];
  seed_emails text[] := ARRAY[
    'admin@dcreator.vn',
    'brand@dcreator.vn',
    'creator@dcreator.vn',
    'user@dcreator.vn'
  ];
  existing_tables text[];
BEGIN
  IF current_setting('app.allow_deploy_data_reset', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION
      'Blocked deploy data reset. Set app.allow_deploy_data_reset=true from the guarded runner.';
  END IF;

  SELECT array_agg(format('%I.%I', table_schema, table_name))
  INTO existing_tables
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name = ANY(reset_tables);

  IF existing_tables IS NOT NULL AND array_length(existing_tables, 1) > 0 THEN
    RAISE NOTICE 'Truncating deploy data tables: %', array_to_string(existing_tables, ', ');
    EXECUTE 'TRUNCATE TABLE ' || array_to_string(existing_tables, ', ') || ' RESTART IDENTITY CASCADE';
  ELSE
    RAISE NOTICE 'No matching reset tables found in public schema.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'Account'
  ) THEN
    DELETE FROM public."Account"
    WHERE email <> ALL(seed_emails);
    RAISE NOTICE 'Pruned non-seed Account rows; seed Account rows were preserved if present.';
  END IF;
END $$;
