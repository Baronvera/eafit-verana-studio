import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './common/prisma.service';
import { McpConnectionService } from './mcp/mcp-connection.service';
import { McpRegistryService } from './mcp/mcp-registry.service';
import { AuthManagerService } from './auth/auth-manager.service';
import { BridgeService } from './bridge/bridge.service';
import { BridgeController } from './bridge/bridge.controller';
import { ConnectorsController } from './connectors/connectors.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [
    PrismaService,
    McpConnectionService,
    AuthManagerService,
    McpRegistryService,
    BridgeService,
  ],
  controllers: [BridgeController, ConnectorsController],
})
export class AppModule {}
