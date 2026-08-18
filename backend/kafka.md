# Kafka topics used in the backend

This is a simple map of the Kafka topics used across the microservices and how the event flow moves between them.

## Event flow

1. Cart checkout creates an order
   - Producer: `cartService`
   - Topic: `order.created`
   - Trigger: when a customer checks out the cart

2. Payment is processed
   - Consumer: `paymentService`
   - Topic: `order.created`
   - Producer: `paymentService`
   - Topic: `payment.completed`

3. Order is confirmed or marked failed
   - Consumer: `orderService`
   - Topic: `payment.completed`
   - Producer: `orderService`
   - Topic: `order.confirmed`

4. Restaurant accepts or rejects the order
   - Consumer: `restOrderService`
   - Topic: `order.confirmed`
   - Producer: `restOrderService`
   - Topics: `restaurant.accepted`, `restaurant.rejected`

5. Delivery agent is matched
   - Consumer: `delAgentMatchingService`
   - Topic: `restaurant.accepted`
   - Producer: `delAgentMatchingService`
   - Topic: `agent.assigned`

6. Notifications listen to multiple topics
   - Consumer: `notificationService`
   - Topics: `order.created`, `payment.completed`, `order.confirmed`, `restaurant.accepted`, `restaurant.rejected`, `agent.assigned`, `location.updates`

## Topic list

- `order.created`
  - Sent by: `cartService`
  - Consumed by: `paymentService`

- `payment.completed`
  - Sent by: `paymentService`
  - Consumed by: `orderService`, `notificationService`

- `order.confirmed`
  - Sent by: `orderService`
  - Consumed by: `restOrderService`, `notificationService`

- `restaurant.accepted`
  - Sent by: `restOrderService`
  - Consumed by: `delAgentMatchingService`, `notificationService`

- `restaurant.rejected`
  - Sent by: `restOrderService`
  - Consumed by: `notificationService`

- `agent.assigned`
  - Sent by: `delAgentMatchingService`
  - Consumed by: `notificationService`

- `location.updates`
  - Used for delivery tracking updates
  - Mainly consumed by `notificationService` for stub tracking logs

## Simple flow diagram

`cartService` -> `order.created` -> `paymentService` -> `payment.completed` -> `orderService` -> `order.confirmed` -> `restOrderService` -> (`restaurant.accepted` or `restaurant.rejected`) -> `delAgentMatchingService` -> `agent.assigned`

This covers the main Kafka workflow in the app right now.
