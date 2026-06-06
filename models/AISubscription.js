const mongoose = require('mongoose');

const AISubscriptionSchema =
  new mongoose.Schema({

    email: {
      type: String,
      required: true
    },

    phone: {
      type: String,
      required: true
    },

    name: {
      type: String,
      required: true
    },

    expiryDate: {
      type: Date,
      required: true
    }

  });

module.exports = mongoose.model(
  'AISubscription',
  AISubscriptionSchema
);