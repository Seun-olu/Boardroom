import { RUN_ID, adminClient, testUser } from "./admin";

/** Creates confirmed test users (no emails are sent) and hands them to workers via env. */
export default async function globalSetup() {
  const admin = adminClient();
  const users = { alice: testUser("alice"), bob: testUser("bob") };
  for (const u of Object.values(users)) {
    const { error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { display_name: u.name },
    });
    if (error) throw error;
  }
  process.env.E2E_RUN_ID = RUN_ID;
  process.env.E2E_USERS = JSON.stringify(users);
}
