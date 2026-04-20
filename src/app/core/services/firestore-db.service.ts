import { Injectable } from '@angular/core';
import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Firestore,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  where
} from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../config/firebase.config';
import { CategoryItem } from '../models/category.model';
import { TransactionItem } from '../models/transaction.model';
import { UserProfile } from '../models/user-profile.model';

interface StoredUserDocument extends UserProfile {
  password: string;
}

interface StoredTransactionDocument extends TransactionItem {
  userEmail: string;
}

interface StoredCategoryDocument extends CategoryItem {
  userEmail: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreDbService {
  readonly #database = this.createDatabase(FIREBASE_CONFIG);

  isEnabled(): boolean {
    return this.#database !== null;
  }

  async getUserByEmail(email: string): Promise<StoredUserDocument | null> {
    const database = this.#database;

    if (!database) {
      return null;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const snapshot = await getDoc(doc(database, 'Users', normalizedEmail));

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as StoredUserDocument;
  }

  async upsertUser(user: StoredUserDocument): Promise<void> {
    const database = this.#database;

    if (!database) {
      return;
    }

    const normalizedEmail = user.email.trim().toLowerCase();

    await setDoc(doc(database, 'Users', normalizedEmail), {
      ...user,
      email: normalizedEmail
    });
  }

  async replaceUserEmail(previousEmail: string, user: StoredUserDocument): Promise<void> {
    const database = this.#database;

    if (!database) {
      return;
    }

    const normalizedPreviousEmail = previousEmail.trim().toLowerCase();
    const normalizedNextEmail = user.email.trim().toLowerCase();

    if (normalizedPreviousEmail !== normalizedNextEmail) {
      await deleteDoc(doc(database, 'Users', normalizedPreviousEmail));
    }

    await this.upsertUser(user);
  }

  async getTransactionsByUser(email: string): Promise<TransactionItem[]> {
    const database = this.#database;

    if (!database) {
      return [];
    }

    const normalizedEmail = email.trim().toLowerCase();
    const transactionsQuery = query(
      collection(database, 'Transactions'),
      where('userEmail', '==', normalizedEmail)
    );

    const snapshot = await getDocs(transactionsQuery);

    return snapshot.docs.map((documentSnapshot) => {
      const value = documentSnapshot.data() as StoredTransactionDocument;

      return {
        id: value.id,
        amount: value.amount,
        category: value.category,
        date: value.date,
        notes: value.notes,
        type: value.type
      } satisfies TransactionItem;
    });
  }

  async upsertTransaction(email: string, transaction: TransactionItem): Promise<void> {
    const database = this.#database;

    if (!database) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    await setDoc(doc(database, 'Transactions', transaction.id), {
      ...transaction,
      userEmail: normalizedEmail
    } satisfies StoredTransactionDocument);
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    const database = this.#database;

    if (!database) {
      return;
    }

    await deleteDoc(doc(database, 'Transactions', transactionId));
  }

  async getCustomCategoriesByUser(email: string): Promise<CategoryItem[]> {
    const database = this.#database;

    if (!database) {
      return [];
    }

    const normalizedEmail = email.trim().toLowerCase();
    const categoriesQuery = query(
      collection(database, 'Categories'),
      where('userEmail', '==', normalizedEmail),
      where('isDefault', '==', false)
    );

    const snapshot = await getDocs(categoriesQuery);

    return snapshot.docs.map((documentSnapshot) => {
      const value = documentSnapshot.data() as StoredCategoryDocument;

      return {
        id: value.id,
        name: value.name,
        icon: value.icon,
        color: value.color,
        isDefault: value.isDefault
      } satisfies CategoryItem;
    });
  }

  async ensureDefaultCategoriesForUser(email: string, defaultCategories: CategoryItem[]): Promise<void> {
    const database = this.#database;

    if (!database) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const categoriesQuery = query(collection(database, 'Categories'), where('userEmail', '==', normalizedEmail));
    const existingSnapshot = await getDocs(categoriesQuery);

    if (!existingSnapshot.empty) {
      return;
    }

    for (const defaultCategory of defaultCategories) {
      const categoryWithOwner: StoredCategoryDocument = {
        ...defaultCategory,
        id: `${normalizedEmail}__${defaultCategory.id}`,
        userEmail: normalizedEmail,
        isDefault: true
      };

      await setDoc(doc(database, 'Categories', categoryWithOwner.id), categoryWithOwner);
    }
  }

  async upsertCustomCategory(email: string, categoryItem: CategoryItem): Promise<void> {
    const database = this.#database;

    if (!database) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    await setDoc(doc(database, 'Categories', categoryItem.id), {
      ...categoryItem,
      userEmail: normalizedEmail
    } satisfies StoredCategoryDocument);
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const database = this.#database;

    if (!database) {
      return;
    }

    await deleteDoc(doc(database, 'Categories', categoryId));
  }

  private createDatabase(firebaseConfig: FirebaseOptions): Firestore | null {
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'YOUR_API_KEY') {
      return null;
    }

    const app = this.resolveApp(firebaseConfig);
    return getFirestore(app);
  }

  private resolveApp(firebaseConfig: FirebaseOptions): FirebaseApp {
    if (getApps().length === 0) {
      return initializeApp(firebaseConfig);
    }

    return getApp();
  }
}
