import { z } from "zod";
import { errorMiddleware } from "../../middlewares/error.middleware.js";
import {
  authMiddleware,
  adminAuthMiddleware,
} from "../../middlewares/auth.middleware.js";
import { firebaseMiddleware } from "../../middlewares/firebase.middleware.js";

export const config = {
  name: "AdminDeleteIngredient",
  type: "api",
  path: "/api/admin/ingredients/:ingredientId",
  method: "DELETE",
  description: "Delete an ingredient (Admin only)",
  flows: ['ingredient-management'],
  emits: ['ingredient.deleted'],
  middleware: [
    firebaseMiddleware,
    authMiddleware,
    adminAuthMiddleware,
    errorMiddleware,
  ],
};

export const handler = async (req, { logger, db }) => {
  const ingredientName = req.pathParams.ingredientId;

  logger.info("Deleting ingredient by name", { ingredientName });

  const snapshot = await db
    .collection("ingredients")
    .where("name", "==", ingredientName)
    .limit(1)
    .get();

  if (snapshot.empty) {
    logger.warn("Ingredient not found", { ingredientName });
    return {
      status: 404,
      body: { success: false, message: "Ingredient not found" },
    };
  }

  const docRef = snapshot.docs[0].ref;

  logger.info("Deleting Firestore document", {
    docId: docRef.id,
  });

  await docRef.delete();

  logger.warn("Ingredient deleted successfully", {
    ingredientName,
    docId: docRef.id,
  });

  return {
    status: 200,
    body: { success: true, message: "Ingredient deleted successfully" },
  };
};
