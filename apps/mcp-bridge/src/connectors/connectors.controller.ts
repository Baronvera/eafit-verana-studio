import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CONNECTOR_CATALOG } from './connector-catalog';

@ApiTags('connectors')
@Controller('connectors')
export class ConnectorsController {
  @Get()
  @ApiOperation({ summary: 'Catálogo de conectores predefinidos' })
  list() {
    return CONNECTOR_CATALOG.map(({ id, name, description, icon, type, authType, credentialFields, tools }) => ({
      id, name, description, icon, type, authType, credentialFields,
      toolCount: tools.length,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un conector con sus tools' })
  detail(id: string) {
    return CONNECTOR_CATALOG.find((c) => c.id === id);
  }
}
