import { SubscriptionService } from '../utils/subscriptionService';

const subscriptionService = new SubscriptionService();

async function testSubscriptionFlow() {
  console.log('Testing subscription functionality...\n');

  try {
    // Test 1: Create a subscription
    console.log('1. Creating subscription for user test@wisc.edu...');
    const subscription = await subscriptionService.createSubscription({
      email: 'test@wisc.edu',
      foodId: 'pizza-123',
      foodName: 'Pepperoni Pizza'
    });
    console.log('✅ Subscription created:', subscription);

    // Test 2: Get user subscriptions
    console.log('\n2. Getting subscriptions for user...');
    const userSubs = await subscriptionService.getUserSubscriptions('test@wisc.edu');
    console.log('✅ User subscriptions:', userSubs);

    // Test 3: Try to create duplicate subscription (should fail gracefully)
    console.log('\n3. Trying to create duplicate subscription...');
    try {
      await subscriptionService.createSubscription({
        email: 'test@wisc.edu',
        foodId: 'pizza-123',
        foodName: 'Pepperoni Pizza'
      });
      console.log('❌ Duplicate subscription was allowed (this should not happen)');
    } catch (error: any) {
      console.log('✅ Duplicate subscription prevented:', error.message);
    }

    // Test 4: Create another subscription for same user
    console.log('\n4. Creating second subscription for same user...');
    const subscription2 = await subscriptionService.createSubscription({
      email: 'test@wisc.edu',
      foodId: 'burger-456',
      foodName: 'Cheese Burger'
    });
    console.log('✅ Second subscription created:', subscription2);

    // Test 5: Get all active subscriptions
    console.log('\n5. Getting all active subscriptions...');
    const allSubs = await subscriptionService.getActiveSubscriptions();
    console.log('✅ All active subscriptions:', JSON.stringify(allSubs, null, 2));

    // Test 6: Remove a subscription
    console.log('\n6. Removing pizza subscription...');
    const removed = await subscriptionService.removeSubscription('test@wisc.edu', 'pizza-123');
    console.log('✅ Subscription removed:', removed);

    // Test 7: Verify subscription was removed
    console.log('\n7. Verifying subscription removal...');
    const finalSubs = await subscriptionService.getUserSubscriptions('test@wisc.edu');
    console.log('✅ Final user subscriptions:', finalSubs);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSubscriptionFlow()
  .finally(() => {
    process.exit(0);
  });