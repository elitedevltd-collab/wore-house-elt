import { Module } from '@nestjs/common';
import { BarcodeService } from './barcode.service';
import { BarcodeController } from './barcode.controller';

@Module({
  providers: [BarcodeService],
  controllers: [BarcodeController],
  exports: [BarcodeService],
})
export class BarcodeModule {}
