// https://stripe.com/docs/payments/without-card-authentication
const stripe = require("stripe")(process.env.STRIPE_KEY)

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(400);
    res.json({
      error: { code: 'INVALID_METHOD', message: "Only POST method is allowed" }
    });
    return;
  }

  const order = req.body;
  console.log(order);
  // FIXME: the payload should be validated against a JSON schema
  // Otherwise, if clients send the wrong types or miss fields,
  // they will have a hard time understanding why this function
  // doesn't work correctly

  const calculateOrderAmount = items => {
    // Replace this constant with a calculation of the order's amount
    // You should always calculate the order total on the server to prevent
    // people from directly manipulating the amount on the client
    return 1400
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount: calculateOrderAmount(order.items),
      currency: "usd",
      payment_method: order.payment_method_id,

      // A PaymentIntent can be confirmed some time after creation,
      // but here we want to confirm (collect payment) immediately.
      confirm: true,

      // If the payment requires any follow-up actions from the
      // customer, like two-factor authentication, Stripe will error
      // and you will need to prompt them for a new payment method.
      error_on_requires_action: true,
    })

    if (intent.status === "succeeded") {
      // This creates a new Customer and attaches the PaymentMethod in one API call.
      const customer = await stripe.customers.create({
        payment_method: intent.payment_method,
        email: order.email,
        address: order.address,
      })
      // Handle post-payment fulfillment
      console.log(`Created Payment: ${intent.id} for Customer: ${customer.id}`)

      // Now ship those goodies
      // await inventoryAPI.ship(order)

      res.status(200);
      res.json({ ok: true });
    } else {
      const message = "Unexpected status " + intent.status;

      // Any other status would be unexpected, so error
      console.log({ error: message })

      res.status(500);
      res.json({ error: { code: 'PAYMENT_ERROR', message } });
    }
  } catch (e) {
    if (e.type === "StripeCardError") {
      // Display error to customer
      console.log({ error: e.message })
    } else {
      // Something else happened
      console.log({ error: e.type })
    }

    res.status(500);
    res.json({ error: { code: e.type, message: e.message } });
  }
}
