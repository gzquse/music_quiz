// InstantDB permissions. Push with: npx instant-cli push perms
//
// Only the Form Coach namespaces are restricted here; namespaces not listed
// (the weekly survey) keep Instant's default open rules, as before.
// The server uses the admin token, which bypasses these rules.

import type { InstantRules } from "@instantdb/react";

const rules = {
  coach_accounts: {
    allow: {
      view: "auth.id != null && auth.id == data.userId",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  coach_instructors: {
    allow: {
      view: "auth.id != null && auth.id == data.userId",
      create: "auth.id != null && auth.id == data.userId",
      update: "auth.id != null && auth.id == data.userId && auth.id == newData.userId",
      delete: "auth.id != null && auth.id == data.userId",
    },
  },
  coach_sessions: {
    allow: {
      view: "auth.id != null && auth.id == data.userId",
      create: "false",
      update: "auth.id != null && auth.id == data.userId && auth.id == newData.userId",
      delete: "auth.id != null && auth.id == data.userId",
    },
  },
} satisfies InstantRules;

export default rules;
