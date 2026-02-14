
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface Order {
    merchantOrderId: string;
    amount: number;
    productDetails: any;
    customer: {
        name: string;
        email: string;
        phone?: string;
    };
    status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
    reference?: string;
    createdAt: Date;
    updatedAt: Date;
}

@Injectable()
export class OrdersService {
    private readonly filePath = path.join(process.cwd(), 'data', 'orders.json');
    private orders: Map<string, Order> = new Map();
    private readonly logger = new Logger(OrdersService.name);

    constructor() {
        this.loadOrders();
    }

    private loadOrders() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, 'utf8');
                const ordersArray: Order[] = JSON.parse(data);
                ordersArray.forEach(order => {
                    // Restore Date objects
                    order.createdAt = new Date(order.createdAt);
                    order.updatedAt = new Date(order.updatedAt);
                    this.orders.set(order.merchantOrderId, order);
                });
                this.logger.log(`Loaded ${this.orders.size} orders from disk.`);
            } else {
                // Ensure directory exists
                const dir = path.dirname(this.filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                this.saveOrders(); // Create empty file
            }
        } catch (error) {
            this.logger.error('Failed to load orders', error);
        }
    }

    private saveOrders() {
        try {
            const ordersArray = Array.from(this.orders.values());
            fs.writeFileSync(this.filePath, JSON.stringify(ordersArray, null, 2));
        } catch (error) {
            this.logger.error('Failed to save orders', error);
        }
    }

    createOrder(orderData: Omit<Order, 'status' | 'createdAt' | 'updatedAt'>): Order {
        const order: Order = {
            ...orderData,
            status: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.orders.set(order.merchantOrderId, order);
        this.saveOrders();
        return order;
    }

    getOrder(merchantOrderId: string): Order | undefined {
        return this.orders.get(merchantOrderId);
    }

    updateOrderStatus(merchantOrderId: string, status: Order['status'], reference?: string): Order | null {
        const order = this.orders.get(merchantOrderId);
        if (!order) return null;

        order.status = status;
        if (reference) order.reference = reference;
        order.updatedAt = new Date();

        this.orders.set(merchantOrderId, order);
        this.saveOrders();
        return order;
    }
}
