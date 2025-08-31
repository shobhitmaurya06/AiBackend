import { clerkClient } from "@clerk/express";

export const auth = async (req, res, next) => {
  console.log("auth");
  try {
    const { userId } = req.auth(); // Clerk attaches this

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Get user from Clerk
    const user = await clerkClient.users.getUser(userId);

    // Check plan from privateMetadata
    const hasPremiumPlan = user.privateMetadata?.plan === "premium";

    // Free usage logic
    if (!hasPremiumPlan && user.privateMetadata?.free_usage) {
      req.free_usage = user.privateMetadata.free_usage;
    } else {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          ...user.privateMetadata, // keep existing keys!
          free_usage: 0, // reset
        },
      });
      req.free_usage = 0;
    }

    // Attach plan to req
    req.plan = hasPremiumPlan ? "premium" : "free";

    next();
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};
