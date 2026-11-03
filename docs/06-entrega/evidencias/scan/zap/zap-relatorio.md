# ZAP Scanning Report

ZAP by [Checkmarx](https://checkmarx.com/).


## Summary of Alerts

| Risk Level | Number of Alerts |
| --- | --- |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| Informational | 2 |




## Insights

| Level | Reason | Site | Description | Statistic |
| --- | --- | --- | --- | --- |
| Medium | Exceeded High | http://host.docker.internal:3001 | Percentage of responses with status code 4xx | 100 % |
| Info | Informational | http://host.docker.internal:3001 | Percentage of endpoints with method DELETE | 9 % |
| Info | Informational | http://host.docker.internal:3001 | Percentage of endpoints with method GET | 52 % |
| Info | Informational | http://host.docker.internal:3001 | Percentage of endpoints with method PATCH | 2 % |
| Info | Informational | http://host.docker.internal:3001 | Percentage of endpoints with method POST | 30 % |
| Info | Informational | http://host.docker.internal:3001 | Percentage of endpoints with method PUT | 5 % |
| Info | Informational | http://host.docker.internal:3001 | Count of total endpoints | 153    |
| Info | Exceeded Low | http://host.docker.internal:3001 | Percentage of slow responses | 5 % |







## Alerts

| Name | Risk Level | Number of Instances |
| --- | --- | --- |
| A Client Error response code was returned by the server | Informational | 154 |
| Non-Storable Content | Informational | Systemic |




## Alert Detail



### [ A Client Error response code was returned by the server ](https://www.zaproxy.org/docs/alerts/100000/)



##### Informational (High)

### Description

A response code of 400 was returned by the server.
This may indicate that the application is failing to handle unexpected input correctly.
Raised by the 'Alert on HTTP Response Code Error' script

* URL: http://host.docker.internal:3001/customers/customerId
  * Node Name: `http://host.docker.internal:3001/customers/customerId`
  * Method: `DELETE`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/customers/customerId/
  * Node Name: `http://host.docker.internal:3001/customers/customerId/`
  * Method: `DELETE`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens/itemId
  * Node Name: `http://host.docker.internal:3001/itens/itemId`
  * Method: `DELETE`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens/itemId/
  * Node Name: `http://host.docker.internal:3001/itens/itemId/`
  * Method: `DELETE`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items/parts/osItemId
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items/parts/osItemId`
  * Method: `DELETE`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items/parts/osItemId/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items/parts/osItemId/`
  * Method: `DELETE`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items/services/osServicoId
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items/services/osServicoId`
  * Method: `DELETE`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items/services/osServicoId/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items/services/osServicoId/`
  * Method: `DELETE`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/services/serviceId
  * Node Name: `http://host.docker.internal:3001/services/serviceId`
  * Method: `DELETE`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/services/serviceId/
  * Node Name: `http://host.docker.internal:3001/services/serviceId/`
  * Method: `DELETE`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/users/userId
  * Node Name: `http://host.docker.internal:3001/users/userId`
  * Method: `DELETE`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/users/userId/
  * Node Name: `http://host.docker.internal:3001/users/userId/`
  * Method: `DELETE`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/vehicles/vehicleId
  * Node Name: `http://host.docker.internal:3001/vehicles/vehicleId`
  * Method: `DELETE`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/vehicles/vehicleId/
  * Node Name: `http://host.docker.internal:3001/vehicles/vehicleId/`
  * Method: `DELETE`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001
  * Node Name: `http://host.docker.internal:3001`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/
  * Node Name: `http://host.docker.internal:3001/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/2437917651303771540
  * Node Name: `http://host.docker.internal:3001/2437917651303771540`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/auth
  * Node Name: `http://host.docker.internal:3001/auth`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/auth/
  * Node Name: `http://host.docker.internal:3001/auth/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/auth/1013310165925433684
  * Node Name: `http://host.docker.internal:3001/auth/1013310165925433684`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/auth/actuator/health
  * Node Name: `http://host.docker.internal:3001/auth/actuator/health`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/customers
  * Node Name: `http://host.docker.internal:3001/customers`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/customers%3Fpage=1&pageSize=20&usuarioDocumento=52998224725&usuarioNome=maria
  * Node Name: `http://host.docker.internal:3001/customers (page,pageSize,usuarioDocumento,usuarioNome)`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/customers/
  * Node Name: `http://host.docker.internal:3001/customers/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/customers/3254069285955501561
  * Node Name: `http://host.docker.internal:3001/customers/3254069285955501561`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/customers/customerId
  * Node Name: `http://host.docker.internal:3001/customers/customerId`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/customers/customerId/
  * Node Name: `http://host.docker.internal:3001/customers/customerId/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/customers/customerId/9148560042053796261
  * Node Name: `http://host.docker.internal:3001/customers/customerId/9148560042053796261`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/customers/customerId/vehicles%3Fpage=1&pageSize=20&usuarioId=usuarioId&veiculoPlaca=ABC1D23
  * Node Name: `http://host.docker.internal:3001/customers/customerId/vehicles (page,pageSize,usuarioId,veiculoPlaca)`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/customers/customerId/vehicles/
  * Node Name: `http://host.docker.internal:3001/customers/customerId/vehicles/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens
  * Node Name: `http://host.docker.internal:3001/itens`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens%3Fpage=1&pageSize=20&itemEstoqueTipo=itemEstoqueTipo
  * Node Name: `http://host.docker.internal:3001/itens (itemEstoqueTipo,page,pageSize)`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens/
  * Node Name: `http://host.docker.internal:3001/itens/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens/5127712126933890230
  * Node Name: `http://host.docker.internal:3001/itens/5127712126933890230`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens/itemId
  * Node Name: `http://host.docker.internal:3001/itens/itemId`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens/itemId/
  * Node Name: `http://host.docker.internal:3001/itens/itemId/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens/itemId/7101544070782064111
  * Node Name: `http://host.docker.internal:3001/itens/itemId/7101544070782064111`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens/itemId/stock-movements%3Fpage=1&pageSize=20&movimentacaoTipo=ENTRADA&ordemServicoId=ordemServicoId
  * Node Name: `http://host.docker.internal:3001/itens/itemId/stock-movements (movimentacaoTipo,ordemServicoId,page,pageSize)`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens/itemId/stock-movements/
  * Node Name: `http://host.docker.internal:3001/itens/itemId/stock-movements/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/metrics
  * Node Name: `http://host.docker.internal:3001/metrics`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/metrics/
  * Node Name: `http://host.docker.internal:3001/metrics/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/metrics/8494548656292430214
  * Node Name: `http://host.docker.internal:3001/metrics/8494548656292430214`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/metrics/average-execution-time%3Ffrom=from&to=to&serviceId=serviceId
  * Node Name: `http://host.docker.internal:3001/metrics/average-execution-time (from,serviceId,to)`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/metrics/average-execution-time/
  * Node Name: `http://host.docker.internal:3001/metrics/average-execution-time/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders
  * Node Name: `http://host.docker.internal:3001/service-orders`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders%3Fpage=1&pageSize=20&status=RECEBIDA&clientId=clientId&veiculoId=veiculoId&from=from&to=to
  * Node Name: `http://host.docker.internal:3001/service-orders (clientId,from,page,pageSize,status,to,veiculoId)`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/
  * Node Name: `http://host.docker.internal:3001/service-orders/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/2585730444490972971
  * Node Name: `http://host.docker.internal:3001/service-orders/2585730444490972971`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/3865402879250386894
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/3865402879250386894`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items/1459864931550390747
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items/1459864931550390747`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items/parts
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items/parts`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items/parts/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items/parts/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items/parts/3294894192757491875
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items/parts/3294894192757491875`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items/services
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items/services`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items/services/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items/services/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items/services/762055925570294851
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items/services/762055925570294851`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/quote
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/quote`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/quote/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/quote/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/quote/6424199269852992624
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/quote/6424199269852992624`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/status-history
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/status-history`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/status-history/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/status-history/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/services
  * Node Name: `http://host.docker.internal:3001/services`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/services%3Fpage=1&pageSize=20&servicoNome=%25C3%25B3leo&servicoAtivo=true
  * Node Name: `http://host.docker.internal:3001/services (page,pageSize,servicoAtivo,servicoNome)`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/services/
  * Node Name: `http://host.docker.internal:3001/services/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/services/2845345374404733186
  * Node Name: `http://host.docker.internal:3001/services/2845345374404733186`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/services/serviceId
  * Node Name: `http://host.docker.internal:3001/services/serviceId`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/services/serviceId/
  * Node Name: `http://host.docker.internal:3001/services/serviceId/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/tracking
  * Node Name: `http://host.docker.internal:3001/tracking`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/tracking/
  * Node Name: `http://host.docker.internal:3001/tracking/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/tracking/6279964480088884602
  * Node Name: `http://host.docker.internal:3001/tracking/6279964480088884602`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/tracking/service-orders
  * Node Name: `http://host.docker.internal:3001/tracking/service-orders`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/tracking/service-orders/
  * Node Name: `http://host.docker.internal:3001/tracking/service-orders/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/tracking/service-orders/3147598224122044164
  * Node Name: `http://host.docker.internal:3001/tracking/service-orders/3147598224122044164`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/tracking/service-orders/serviceOrderId
  * Node Name: `http://host.docker.internal:3001/tracking/service-orders/serviceOrderId`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/
  * Node Name: `http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/5388775405508579055
  * Node Name: `http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/5388775405508579055`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/quote
  * Node Name: `http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/quote`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/quote/
  * Node Name: `http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/quote/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/quote/8905990853844414526
  * Node Name: `http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/quote/8905990853844414526`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/users
  * Node Name: `http://host.docker.internal:3001/users`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/users%3Fpage=1&pageSize=20&perfilId=perfilId
  * Node Name: `http://host.docker.internal:3001/users (page,pageSize,perfilId)`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/users/
  * Node Name: `http://host.docker.internal:3001/users/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/users/3666649136947329740
  * Node Name: `http://host.docker.internal:3001/users/3666649136947329740`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/users/userId
  * Node Name: `http://host.docker.internal:3001/users/userId`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/users/userId/
  * Node Name: `http://host.docker.internal:3001/users/userId/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/vehicles
  * Node Name: `http://host.docker.internal:3001/vehicles`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/vehicles%3Fpage=1&pageSize=20&usuarioId=usuarioId&veiculoPlaca=ABC1D23
  * Node Name: `http://host.docker.internal:3001/vehicles (page,pageSize,usuarioId,veiculoPlaca)`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/vehicles/
  * Node Name: `http://host.docker.internal:3001/vehicles/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/vehicles/1914571827141707248
  * Node Name: `http://host.docker.internal:3001/vehicles/1914571827141707248`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/vehicles/vehicleId
  * Node Name: `http://host.docker.internal:3001/vehicles/vehicleId`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/vehicles/vehicleId/
  * Node Name: `http://host.docker.internal:3001/vehicles/vehicleId/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/users/userId
  * Node Name: `http://host.docker.internal:3001/users/userId ()({})`
  * Method: `PATCH`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/users/userId/
  * Node Name: `http://host.docker.internal:3001/users/userId/ ()({})`
  * Method: `PATCH`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/vehicles/vehicleId
  * Node Name: `http://host.docker.internal:3001/vehicles/vehicleId ()({})`
  * Method: `PATCH`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/vehicles/vehicleId/
  * Node Name: `http://host.docker.internal:3001/vehicles/vehicleId/ ()({})`
  * Method: `PATCH`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/auth/login
  * Node Name: `http://host.docker.internal:3001/auth/login ()({email,senha})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/auth/login/
  * Node Name: `http://host.docker.internal:3001/auth/login/ ()({email,senha})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/auth/logout
  * Node Name: `http://host.docker.internal:3001/auth/logout ()({refreshToken})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/auth/logout/
  * Node Name: `http://host.docker.internal:3001/auth/logout/ ()({refreshToken})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/auth/refresh
  * Node Name: `http://host.docker.internal:3001/auth/refresh ()({refreshToken})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/auth/refresh/
  * Node Name: `http://host.docker.internal:3001/auth/refresh/ ()({refreshToken})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/auth/register
  * Node Name: `http://host.docker.internal:3001/auth/register ()({usuarioNome,usuarioEmail,usuarioDocumento,usuarioTipoDocumento,usuarioTelefone,senha,perfilId})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/auth/register/
  * Node Name: `http://host.docker.internal:3001/auth/register/ ()({usuarioNome,usuarioEmail,usuarioDocumento,usuarioTipoDocumento,usuarioTelefone,senha,perfilId})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/computeMetadata/v1/
  * Node Name: `http://host.docker.internal:3001/computeMetadata/v1/ ()({email,senha})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/customers
  * Node Name: `http://host.docker.internal:3001/customers ()({usuarioNome,usuarioEmail,usuarioDocumento,usuarioTipoDocumento,usuarioTelefone})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/customers/
  * Node Name: `http://host.docker.internal:3001/customers/ ()({usuarioNome,usuarioEmail,usuarioDocumento,usuarioTipoDocumento,usuarioTelefone})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens
  * Node Name: `http://host.docker.internal:3001/itens ()({itemEstoqueTipo,itemEstoqueNome,itemEstoqueDescricao,itemEstoqueUnidade,itemEstoquePrecoVenda,itemEstoqueQuantidade})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens/
  * Node Name: `http://host.docker.internal:3001/itens/ ()({itemEstoqueTipo,itemEstoqueNome,itemEstoqueDescricao,itemEstoqueUnidade,itemEstoquePrecoVenda,itemEstoqueQuantidade})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens/itemId/stock-movements
  * Node Name: `http://host.docker.internal:3001/itens/itemId/stock-movements ()({movimentacaoTipo,movimentacaoQuantidade,movimentacaoMotivo})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens/itemId/stock-movements/
  * Node Name: `http://host.docker.internal:3001/itens/itemId/stock-movements/ ()({movimentacaoTipo,movimentacaoQuantidade,movimentacaoMotivo})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/latest/meta-data/
  * Node Name: `http://host.docker.internal:3001/latest/meta-data/ ()({email,senha})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/metadata/instance
  * Node Name: `http://host.docker.internal:3001/metadata/instance ()({email,senha})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/metadata/v1
  * Node Name: `http://host.docker.internal:3001/metadata/v1 ()({email,senha})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/opc/v1/instance/
  * Node Name: `http://host.docker.internal:3001/opc/v1/instance/ ()({email,senha})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/opc/v2/instance/
  * Node Name: `http://host.docker.internal:3001/opc/v2/instance/ ()({email,senha})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/openstack/latest/meta_data.json
  * Node Name: `http://host.docker.internal:3001/openstack/latest/meta_data.json ()({email,senha})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders
  * Node Name: `http://host.docker.internal:3001/service-orders ()({clientId,customerDocument,veiculoId,mecanicoId,ordemServicoDescricaoProblema,ordemServicoKmEntrada})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/
  * Node Name: `http://host.docker.internal:3001/service-orders/ ()({clientId,customerDocument,veiculoId,mecanicoId,ordemServicoDescricaoProblema,ordemServicoKmEntrada})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/cancel
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/cancel ()({reason})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/cancel/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/cancel/ ()({reason})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/complete
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/complete`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/complete/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/complete/`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/deliver
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/deliver`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/deliver/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/deliver/`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/diagnosis
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/diagnosis`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/diagnosis/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/diagnosis/`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items/parts
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items/parts ()({itemEstoqueId,osItemQuantidade})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items/parts/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items/parts/ ()({itemEstoqueId,osItemQuantidade})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items/services
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items/services ()({servicoId,osServicoQuantidade})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/items/services/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/items/services/ ()({servicoId,osServicoQuantidade})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/quote/send
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/quote/send`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/quote/send/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/quote/send/`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/start-execution
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/start-execution`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/start-execution/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/start-execution/`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/services
  * Node Name: `http://host.docker.internal:3001/services ()({servicoNome,servicoDescricao,servicoPrecoBase})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/services/
  * Node Name: `http://host.docker.internal:3001/services/ ()({servicoNome,servicoDescricao,servicoPrecoBase})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/quote/approve
  * Node Name: `http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/quote/approve`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/quote/approve/
  * Node Name: `http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/quote/approve/`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/quote/reject
  * Node Name: `http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/quote/reject ()({reason})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/quote/reject/
  * Node Name: `http://host.docker.internal:3001/tracking/service-orders/serviceOrderId/quote/reject/ ()({reason})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/vehicles
  * Node Name: `http://host.docker.internal:3001/vehicles ()({usuarioId,veiculoPlaca,veiculoChassi,veiculoMarca,veiculoModelo,veiculoAnoFabricacao,veiculoCor,veiculoKmAtual})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/vehicles/
  * Node Name: `http://host.docker.internal:3001/vehicles/ ()({usuarioId,veiculoPlaca,veiculoChassi,veiculoMarca,veiculoModelo,veiculoAnoFabricacao,veiculoCor,veiculoKmAtual})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/customers/customerId
  * Node Name: `http://host.docker.internal:3001/customers/customerId ()({})`
  * Method: `PUT`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/customers/customerId/
  * Node Name: `http://host.docker.internal:3001/customers/customerId/ ()({})`
  * Method: `PUT`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens/itemId
  * Node Name: `http://host.docker.internal:3001/itens/itemId ()({})`
  * Method: `PUT`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/itens/itemId/
  * Node Name: `http://host.docker.internal:3001/itens/itemId/ ()({})`
  * Method: `PUT`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId ()({mecanicoId,ordemServicoDescricaoProblema,ordemServicoDiagnostico,ordemServicoKmEntrada})`
  * Method: `PUT`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/service-orders/serviceOrderId/
  * Node Name: `http://host.docker.internal:3001/service-orders/serviceOrderId/ ()({mecanicoId,ordemServicoDescricaoProblema,ordemServicoDiagnostico,ordemServicoKmEntrada})`
  * Method: `PUT`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/services/serviceId
  * Node Name: `http://host.docker.internal:3001/services/serviceId ()({})`
  * Method: `PUT`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/services/serviceId/
  * Node Name: `http://host.docker.internal:3001/services/serviceId/ ()({})`
  * Method: `PUT`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``


Instances: 154

### Solution



### Reference



#### CWE Id: [ 388 ](https://cwe.mitre.org/data/definitions/388.html)


#### WASC Id: 20

#### Source ID: 4

### [ Non-Storable Content ](https://www.zaproxy.org/docs/alerts/10049/)



##### Informational (Medium)

### Description

The response contents are not storable by caching components such as proxy servers. If the response does not contain sensitive, personal or user-specific information, it may benefit from being stored and cached, to improve performance.

* URL: http://host.docker.internal:3001/users/userId
  * Node Name: `http://host.docker.internal:3001/users/userId`
  * Method: `DELETE`
  * Parameter: ``
  * Attack: ``
  * Evidence: `DELETE `
  * Other Info: ``
* URL: http://host.docker.internal:3001/users/userId
  * Node Name: `http://host.docker.internal:3001/users/userId`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/users/userId
  * Node Name: `http://host.docker.internal:3001/users/userId ()({})`
  * Method: `PATCH`
  * Parameter: ``
  * Attack: ``
  * Evidence: `PATCH `
  * Other Info: ``
* URL: http://host.docker.internal:3001/auth/login
  * Node Name: `http://host.docker.internal:3001/auth/login ()({email,senha})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``
* URL: http://host.docker.internal:3001/auth/refresh
  * Node Name: `http://host.docker.internal:3001/auth/refresh ()({refreshToken})`
  * Method: `POST`
  * Parameter: ``
  * Attack: ``
  * Evidence: `400`
  * Other Info: ``

Instances: Systemic


### Solution

The content may be marked as storable by ensuring that the following conditions are satisfied:
The request method must be understood by the cache and defined as being cacheable ("GET", "HEAD", and "POST" are currently defined as cacheable)
The response status code must be understood by the cache (one of the 1XX, 2XX, 3XX, 4XX, or 5XX response classes are generally understood)
The "no-store" cache directive must not appear in the request or response header fields
For caching by "shared" caches such as "proxy" caches, the "private" response directive must not appear in the response
For caching by "shared" caches such as "proxy" caches, the "Authorization" header field must not appear in the request, unless the response explicitly allows it (using one of the "must-revalidate", "public", or "s-maxage" Cache-Control response directives)
In addition to the conditions above, at least one of the following conditions must also be satisfied by the response:
It must contain an "Expires" header field
It must contain a "max-age" response directive
For "shared" caches such as "proxy" caches, it must contain a "s-maxage" response directive
It must contain a "Cache Control Extension" that allows it to be cached
It must have a status code that is defined as cacheable by default (200, 203, 204, 206, 300, 301, 404, 405, 410, 414, 501).

### Reference


* [ https://datatracker.ietf.org/doc/html/rfc7234 ](https://datatracker.ietf.org/doc/html/rfc7234)
* [ https://datatracker.ietf.org/doc/html/rfc7231 ](https://datatracker.ietf.org/doc/html/rfc7231)
* [ https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html ](https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html)


#### CWE Id: [ 524 ](https://cwe.mitre.org/data/definitions/524.html)


#### WASC Id: 13

#### Source ID: 3


