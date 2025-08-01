import { PubSub } from "@google-cloud/pubsub";
import { google } from "googleapis";

import { env } from "../../env";
import { db } from "../db";
import { getGmailClient, getGoogleOAuthTokens } from "./mail";

// we need a unique identifier for for every deployed URL so that multiple can receive messages
function getSubscriptionFullName(
  subscriptionName: string,
  endpointURL: string
) {
  // some special characters not allowed.
  // strip everything except for alphanumeric
  const strippedEndpointUrl = endpointURL.replace(/[^a-zA-Z0-9]/g, "");
  return `${subscriptionName}${strippedEndpointUrl}`;
}

// For debugging purposes, if we want to reset the pubsub, we can use this to delete it
export async function deletePubSub() {
  const projectId = process.env.PUBSUB_PROJECT_ID!;
  const topicName = process.env.PUBSUB_TOPIC_NAME!;
  const subscriptionName = process.env.PUBSUB_SUBSCRIPTION_NAME!;
  const pushEndpointURL = process.env.PUBSUB_PUSHENDPOINT_URL!;

  const pubsub = new PubSub({
    projectId: projectId,
    credentials: {
      client_email: process.env.PUBSUB_CLIENT_EMAIL,
      private_key: process.env.PUBSUB_PRIVATE_KEY,
    },
  });

  // find and delete topics
  const [topics] = await pubsub.getTopics();
  const existingTopic = topics.find((t) =>
    t.name.endsWith(`/topics/${topicName}`)
  );
  if (existingTopic) {
    await pubsub.topic(existingTopic.name).delete();

    console.log(`Topic ${existingTopic.name} deleted.`);
  }

  const subscriptionFullName = getSubscriptionFullName(
    subscriptionName,
    pushEndpointURL
  );
  const [subscriptions] = await pubsub.getSubscriptions();
  const existingSubscription = subscriptions.find((s) =>
    s.name.endsWith(`/subscriptions/${subscriptionFullName}`)
  );
  if (existingSubscription) {
    await pubsub.subscription(existingSubscription.name).delete();
    console.log(`Subscription ${existingSubscription.name} deleted.`);
  }

  console.log("PubSub deleted successfully");
}

// setup pubsub topic and subscription
export async function setupPubSub() {
  const projectId = process.env.PUBSUB_PROJECT_ID!;
  const topicName = process.env.PUBSUB_TOPIC_NAME!;
  const subscriptionName = process.env.PUBSUB_SUBSCRIPTION_NAME!;
  const pushEndpointURL = process.env.PUBSUB_PUSHENDPOINT_URL!;

  const pubsub = new PubSub({
    projectId: projectId,
    credentials: {
      client_email: process.env.PUBSUB_CLIENT_EMAIL,
      private_key: process.env.PUBSUB_PRIVATE_KEY,
    },
  });

  // Check if the topic exists, create if not
  let topic;
  const [topics] = await pubsub.getTopics();
  const existingTopic = topics.find((t) =>
    t.name.endsWith(`/topics/${topicName}`)
  );
  if (existingTopic) {
    topic = existingTopic;
    console.log(`Topic ${topic.name} already exists.`);
  } else {
    [topic] = await pubsub.createTopic(topicName);
    console.log(`Topic ${topic.name} created.`);
  }

  // Check if the subscription exists, create if not
  const [subscriptions] = await topic.getSubscriptions();
  const subscriptionFullName = getSubscriptionFullName(
    subscriptionName,
    pushEndpointURL
  );

  const existingSubscription = subscriptions.find((s) =>
    s.name.endsWith(`/subscriptions/${subscriptionFullName}`)
  );
  let subscription;
  if (existingSubscription) {
    subscription = existingSubscription;
    console.log(`Subscription ${existingSubscription.name} already exists.`);
  } else {
    [subscription] = await topic.createSubscription(subscriptionFullName, {
      pushEndpoint: pushEndpointURL + "/api/sync/pubsub",
      ackDeadlineSeconds: 10,
    });
    console.log(`Push subscription ${subscription.name} configured`);
  }

  // now, have to give gmail-api-push@system.gserviceaccount.com publish priviledges to the TOPIC
  const [policy] = await topic.iam.getPolicy();

  const member = "serviceAccount:gmail-api-push@system.gserviceaccount.com";
  const role = "roles/pubsub.publisher";

  // Check if binding already exists
  const hasBinding = (policy.bindings ?? []).some(
    (b) => b.role === role && b.members?.includes(member)
  );
  if (!hasBinding) {
    policy.bindings = policy.bindings ?? [];
    policy.bindings.push({
      role,
      members: [member],
    });
    // Set updated policy
    await topic.iam.setPolicy(policy);
    const fullTopic = `projects/${projectId}/topics/${topicName}`;
    console.log(`Granted ${member} the ${role} role on ${fullTopic}`);
  } else {
    const fullTopic = `projects/${projectId}/topics/${topicName}`;
    console.log(`${member} already has ${role} on ${fullTopic}`);
  }

  //   console.log("Go to https://console.cloud.google.com/cloudpubsub/topic/list?inv=1&invt=Ab4R2w&project=gmail-clone-467006 and then provide gmail-api-push@system.gserviceaccount.com publish priviledges to the TOPIC")
}

export async function setupPushInboxUpdates(
  userId: string,
  accessToken: string,
  refreshToken: string
) {
  await setupPubSub();

  const topicName = process.env.PUBSUB_TOPIC_NAME;
  const projectId = process.env.PUBSUB_PROJECT_ID;

  console.log(`tokens = `);
  // subscribe current user to our pubsub
  const gmail = getGmailClient(accessToken, refreshToken);
  const watchRes = await gmail.users.watch({
    userId: "me",
    requestBody: {
      labelIds: ["INBOX"],
      topicName: `projects/${projectId}/topics/${topicName}`,
      labelFilterBehavior: "INCLUDE",
    },
  });

  if (watchRes.data.expiration) {
    console.log("setup push inbox updates successfully");
  }
}
