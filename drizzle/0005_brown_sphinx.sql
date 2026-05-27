DROP TABLE `ubicaciones_repartidores`;--> statement-breakpoint
CREATE INDEX `carritos_cliente_estado_idx` ON `carritos` (`cliente_id`,`estado`);--> statement-breakpoint
CREATE INDEX `pedido_detalles_pedido_idx` ON `pedido_detalles` (`pedido_id`);--> statement-breakpoint
CREATE INDEX `pedidos_restaurante_estado_idx` ON `pedidos` (`restaurante_id`,`estado`);--> statement-breakpoint
CREATE INDEX `pedidos_repartidor_idx` ON `pedidos` (`repartidor_id`);--> statement-breakpoint
CREATE INDEX `pedidos_cliente_idx` ON `pedidos` (`cliente_id`);--> statement-breakpoint
CREATE INDEX `seguimiento_pedido_idx` ON `seguimiento_pedidos` (`pedido_id`);