"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let OrdersService = OrdersService_1 = class OrdersService {
    constructor() {
        this.filePath = path.join(process.cwd(), 'data', 'orders.json');
        this.orders = new Map();
        this.logger = new common_1.Logger(OrdersService_1.name);
        this.loadOrders();
    }
    loadOrders() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, 'utf8');
                const ordersArray = JSON.parse(data);
                ordersArray.forEach(order => {
                    // Restore Date objects
                    order.createdAt = new Date(order.createdAt);
                    order.updatedAt = new Date(order.updatedAt);
                    this.orders.set(order.merchantOrderId, order);
                });
                this.logger.log(`Loaded ${this.orders.size} orders from disk.`);
            }
            else {
                // Ensure directory exists
                const dir = path.dirname(this.filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                this.saveOrders(); // Create empty file
            }
        }
        catch (error) {
            this.logger.error('Failed to load orders', error);
        }
    }
    saveOrders() {
        try {
            const ordersArray = Array.from(this.orders.values());
            fs.writeFileSync(this.filePath, JSON.stringify(ordersArray, null, 2));
        }
        catch (error) {
            this.logger.error('Failed to save orders', error);
        }
    }
    createOrder(orderData) {
        const order = {
            ...orderData,
            status: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.orders.set(order.merchantOrderId, order);
        this.saveOrders();
        return order;
    }
    getOrder(merchantOrderId) {
        return this.orders.get(merchantOrderId);
    }
    updateOrderStatus(merchantOrderId, status, reference) {
        const order = this.orders.get(merchantOrderId);
        if (!order)
            return null;
        order.status = status;
        if (reference)
            order.reference = reference;
        order.updatedAt = new Date();
        this.orders.set(merchantOrderId, order);
        this.saveOrders();
        return order;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], OrdersService);
