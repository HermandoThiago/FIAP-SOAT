import { Controller } from '@nestjs/common';
import { ItemService } from '../services';

@Controller()
export class ItemController {
  constructor(private readonly itemService: ItemService) {}
}
