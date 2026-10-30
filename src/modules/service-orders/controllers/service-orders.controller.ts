import { Controller } from '@nestjs/common';
import { ServiceOrderService } from '../services';

@Controller('service-orders')
export class ServiceOrders {
  constructor(private readonly serviceOrderService: ServiceOrderService) {}
}
