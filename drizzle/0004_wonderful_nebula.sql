ALTER TABLE `productos` ADD `categoria` text;--> statement-breakpoint
ALTER TABLE `productos` ADD `imagen` text;--> statement-breakpoint
ALTER TABLE `restaurantes` ADD `categoria` text;--> statement-breakpoint
ALTER TABLE `restaurantes` ADD `imagen` text;--> statement-breakpoint
ALTER TABLE `restaurantes` ADD `calificacion` real DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurantes` ADD `tiempo_estimado` text DEFAULT '30-40 min' NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurantes` ADD `tarifa_envio` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurantes` ADD `abierto` integer DEFAULT true NOT NULL;