export interface User {
    id: string;  // bv. "user001"
    name: string;
    email: string;
    password: string;
    expenses: Expense[];
    budget : budget;
}
  
export interface Expense {
    id: number;
    description: string;
    amount: number;
    date: Date;
    currency: string;
    paymentMethod: PaymentMethod;
    isIncoming: boolean;
    category: string;
    isPaid: boolean;
}
  
export interface PaymentMethod {
    method: string;
    cardDetails?: CardDetails;
    bankAccountNumber?: string;
}
  
export interface CardDetails {
    cardNumber: number;
    expiryDate: string;
}

export interface budget{
    monthlyLimit: number;
    notificationThreshold: number; //nummer tussen 0 en 1
    isActive : boolean; 
}