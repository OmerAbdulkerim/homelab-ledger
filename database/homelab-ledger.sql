-- Homelab Ledger M2: MySQL 8.0.16+ (enforced CHECK constraints), InnoDB.
-- Exported locally with mysqldump 8.0.46 from the verified sample database.
-- Import into an EMPTY database selected by the client. No DROP/CREATE DATABASE.
-- Hosts, addresses, versions and tasks are synthetic examples.
-- Demo passwords: ledger-admin / ledger-user; users stores only PHP password hashes.
-- Record timestamps and completed_at are UTC.
-- Frontend maintenance maps to SQL maintenance_tasks in M4.
-- Optional server specifications are manual inventory, not measured utilization.
-- Required text rejects ICU whitespace and U+FEFF-only values without rewriting input.

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `applications` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) COLLATE utf8mb4_0900_as_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_0900_as_ci NOT NULL,
  `github_owner` varchar(100) COLLATE utf8mb4_0900_as_ci NOT NULL DEFAULT '',
  `github_repo` varchar(100) COLLATE utf8mb4_0900_as_ci NOT NULL DEFAULT '',
  `notes` text COLLATE utf8mb4_0900_as_ci NOT NULL DEFAULT (_utf8mb4''),
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_applications_description` CHECK (regexp_like(`description`,_utf8mb4'[^[:space:]\\x{FEFF}]')),
  CONSTRAINT `chk_applications_github` CHECK ((((char_length(`github_owner`) = 0) and (char_length(`github_repo`) = 0)) or (regexp_like(`github_owner`,_utf8mb4'[^[:space:]\\x{FEFF}]') and regexp_like(`github_repo`,_utf8mb4'[^[:space:]\\x{FEFF}]')))),
  CONSTRAINT `chk_applications_name` CHECK (regexp_like(`name`,_utf8mb4'[^[:space:]\\x{FEFF}]')),
  CONSTRAINT `chk_applications_notes` CHECK ((char_length(`notes`) <= 5000))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `applications` (`id`, `name`, `description`, `github_owner`, `github_repo`, `notes`) VALUES (1,'Immich','Photo and video library.','immich-app','immich','Review release notes before upgrading.');
INSERT INTO `applications` (`id`, `name`, `description`, `github_owner`, `github_repo`, `notes`) VALUES (2,'Paperless-ngx','Searchable document archive.','paperless-ngx','paperless-ngx','Keep a copy of the export outside the server.');
INSERT INTO `applications` (`id`, `name`, `description`, `github_owner`, `github_repo`, `notes`) VALUES (3,'Gitea','Internal Git hosting.','go-gitea','gitea','Back up repositories and database together.');
INSERT INTO `applications` (`id`, `name`, `description`, `github_owner`, `github_repo`, `notes`) VALUES (4,'Uptime Kuma','Self-hosted status application.','louislam','uptime-kuma','This ledger does not query or monitor this service.');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `deployments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `application_id` int unsigned NOT NULL,
  `server_id` int unsigned NOT NULL,
  `label` varchar(80) COLLATE utf8mb4_0900_as_ci NOT NULL,
  `installed_version` varchar(100) COLLATE utf8mb4_0900_as_ci NOT NULL DEFAULT '',
  `url` varchar(2048) COLLATE utf8mb4_0900_as_ci NOT NULL DEFAULT '',
  `status` enum('running','stopped','planned') COLLATE utf8mb4_0900_as_ci NOT NULL DEFAULT 'planned',
  `deployed_on` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_0900_as_ci NOT NULL DEFAULT (_utf8mb4''),
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'UTC',
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT 'UTC',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_deployments_instance` (`application_id`,`server_id`,`label`),
  KEY `ix_deployments_server` (`server_id`),
  CONSTRAINT `fk_deployments_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_deployments_server` FOREIGN KEY (`server_id`) REFERENCES `servers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_deployments_label` CHECK (regexp_like(`label`,_utf8mb4'[^[:space:]\\x{FEFF}]')),
  CONSTRAINT `chk_deployments_notes` CHECK ((char_length(`notes`) <= 5000)),
  CONSTRAINT `chk_deployments_version` CHECK (((`status` = _utf8mb4'planned') or regexp_like(`installed_version`,_utf8mb4'[^[:space:]\\x{FEFF}]')))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `deployments` (`id`, `application_id`, `server_id`, `label`, `installed_version`, `url`, `status`, `deployed_on`, `notes`, `created_at`, `updated_at`) VALUES (1,1,1,'production','v1.118.2','https://immich.home.example','running','2026-10-12','Household photo library.','2026-10-15 09:00:00.000000','2026-10-20 15:00:00.000000');
INSERT INTO `deployments` (`id`, `application_id`, `server_id`, `label`, `installed_version`, `url`, `status`, `deployed_on`, `notes`, `created_at`, `updated_at`) VALUES (2,2,1,'production','v2.12.0','https://paperless.home.example','running','2026-10-14','Document archive for the household.','2026-10-15 09:00:00.000000','2026-10-20 15:00:00.000000');
INSERT INTO `deployments` (`id`, `application_id`, `server_id`, `label`, `installed_version`, `url`, `status`, `deployed_on`, `notes`, `created_at`, `updated_at`) VALUES (3,3,2,'internal','v1.22.3','https://git.home.example','running','2026-10-08','Private repositories for lab projects.','2026-10-15 09:00:00.000000','2026-10-20 15:00:00.000000');
INSERT INTO `deployments` (`id`, `application_id`, `server_id`, `label`, `installed_version`, `url`, `status`, `deployed_on`, `notes`, `created_at`, `updated_at`) VALUES (4,4,2,'internal','v1.23.15','https://kuma.home.example','stopped','2026-10-09','Manually recorded as stopped; not a live status check.','2026-10-15 09:00:00.000000','2026-10-20 15:00:00.000000');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_tasks` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `server_id` int unsigned DEFAULT NULL,
  `deployment_id` int unsigned DEFAULT NULL,
  `assigned_user_id` int unsigned DEFAULT NULL,
  `title` varchar(160) COLLATE utf8mb4_0900_as_ci NOT NULL,
  `description` text COLLATE utf8mb4_0900_as_ci NOT NULL DEFAULT (_utf8mb4''),
  `status` enum('open','in_progress','completed') COLLATE utf8mb4_0900_as_ci NOT NULL DEFAULT 'open',
  `due_on` date DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL COMMENT 'UTC',
  `outcome` text COLLATE utf8mb4_0900_as_ci NOT NULL DEFAULT (_utf8mb4''),
  PRIMARY KEY (`id`),
  KEY `ix_maintenance_server` (`server_id`),
  KEY `ix_maintenance_deployment` (`deployment_id`),
  KEY `ix_maintenance_assignee_status_due` (`assigned_user_id`,`status`,`due_on`),
  CONSTRAINT `fk_maintenance_assignee` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_maintenance_deployment` FOREIGN KEY (`deployment_id`) REFERENCES `deployments` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_maintenance_server` FOREIGN KEY (`server_id`) REFERENCES `servers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_maintenance_completion` CHECK ((((`status` = _utf8mb4'completed') and (`completed_at` is not null) and regexp_like(`outcome`,_utf8mb4'[^[:space:]\\x{FEFF}]')) or ((`status` <> _utf8mb4'completed') and (`completed_at` is null)))),
  CONSTRAINT `chk_maintenance_description` CHECK ((char_length(`description`) <= 5000)),
  CONSTRAINT `chk_maintenance_outcome` CHECK ((char_length(`outcome`) <= 5000)),
  CONSTRAINT `chk_maintenance_target` CHECK (((`server_id` is not null) <> (`deployment_id` is not null))),
  CONSTRAINT `chk_maintenance_title` CHECK (regexp_like(`title`,_utf8mb4'[^[:space:]\\x{FEFF}]'))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `maintenance_tasks` (`id`, `server_id`, `deployment_id`, `assigned_user_id`, `title`, `description`, `status`, `due_on`, `completed_at`, `outcome`) VALUES (1,NULL,2,1,'Review Paperless release notes','Check migration notes before deciding whether to update.','open','2026-10-28',NULL,'');
INSERT INTO `maintenance_tasks` (`id`, `server_id`, `deployment_id`, `assigned_user_id`, `title`, `description`, `status`, `due_on`, `completed_at`, `outcome`) VALUES (2,NULL,2,1,'Verify backup restore','Restore an export to a disposable test environment.','open','2026-10-30',NULL,'');
INSERT INTO `maintenance_tasks` (`id`, `server_id`, `deployment_id`, `assigned_user_id`, `title`, `description`, `status`, `due_on`, `completed_at`, `outcome`) VALUES (3,2,NULL,2,'Document the developer services','Check the purpose and interface URLs in the ledger.','in_progress','2026-11-01',NULL,'');
INSERT INTO `maintenance_tasks` (`id`, `server_id`, `deployment_id`, `assigned_user_id`, `title`, `description`, `status`, `due_on`, `completed_at`, `outcome`) VALUES (4,1,NULL,1,'Record the storage layout','List the volumes used for media and documents.','completed','2026-10-20','2026-10-20 15:00:00','Documented the volume layout in the server notes.');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) COLLATE utf8mb4_0900_as_ci NOT NULL,
  `hostname` varchar(253) COLLATE utf8mb4_0900_as_ci NOT NULL,
  `purpose` varchar(200) COLLATE utf8mb4_0900_as_ci NOT NULL,
  `operating_system` varchar(100) COLLATE utf8mb4_0900_as_ci DEFAULT NULL,
  `os_version` varchar(100) COLLATE utf8mb4_0900_as_ci DEFAULT NULL,
  `cpu_model` varchar(160) COLLATE utf8mb4_0900_as_ci DEFAULT NULL,
  `cpu_cores` smallint unsigned DEFAULT NULL,
  `ram_mib` int unsigned DEFAULT NULL,
  `storage_gib` int unsigned DEFAULT NULL,
  `notes` text COLLATE utf8mb4_0900_as_ci NOT NULL DEFAULT (_utf8mb4''),
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'UTC',
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT 'UTC',
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_servers_cpu_cores` CHECK (((`cpu_cores` is null) or (`cpu_cores` > 0))),
  CONSTRAINT `chk_servers_cpu_model` CHECK (((`cpu_model` is null) or regexp_like(`cpu_model`,_utf8mb4'[^[:space:]\\x{FEFF}]'))),
  CONSTRAINT `chk_servers_hostname` CHECK (regexp_like(`hostname`,_utf8mb4'[^[:space:]\\x{FEFF}]')),
  CONSTRAINT `chk_servers_name` CHECK (regexp_like(`name`,_utf8mb4'[^[:space:]\\x{FEFF}]')),
  CONSTRAINT `chk_servers_notes` CHECK ((char_length(`notes`) <= 5000)),
  CONSTRAINT `chk_servers_operating_system` CHECK (((`operating_system` is null) or regexp_like(`operating_system`,_utf8mb4'[^[:space:]\\x{FEFF}]'))),
  CONSTRAINT `chk_servers_os_version` CHECK (((`os_version` is null) or regexp_like(`os_version`,_utf8mb4'[^[:space:]\\x{FEFF}]'))),
  CONSTRAINT `chk_servers_purpose` CHECK (regexp_like(`purpose`,_utf8mb4'[^[:space:]\\x{FEFF}]')),
  CONSTRAINT `chk_servers_ram_mib` CHECK (((`ram_mib` is null) or (`ram_mib` > 0))),
  CONSTRAINT `chk_servers_storage_gib` CHECK (((`storage_gib` is null) or (`storage_gib` > 0)))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `servers` (`id`, `name`, `hostname`, `purpose`, `operating_system`, `os_version`, `cpu_model`, `cpu_cores`, `ram_mib`, `storage_gib`, `notes`, `created_at`, `updated_at`) VALUES (1,'atlas','192.168.1.10','Media and documents','Ubuntu Server','24.04 LTS','Intel Core i7-9700',8,32768,2048,'Primary household services. Maintenance window: Sunday evening.','2026-10-01 09:00:00.000000','2026-10-20 15:00:00.000000');
INSERT INTO `servers` (`id`, `name`, `hostname`, `purpose`, `operating_system`, `os_version`, `cpu_model`, `cpu_cores`, `ram_mib`, `storage_gib`, `notes`, `created_at`, `updated_at`) VALUES (2,'beacon','192.168.1.20','Developer tools','Debian','12','AMD Ryzen 5 5600G',6,16384,1024,'Internal developer services and experiments.','2026-10-01 09:00:00.000000','2026-10-20 15:00:00.000000');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) COLLATE utf8mb4_0900_as_ci NOT NULL,
  `email` varchar(254) COLLATE utf8mb4_0900_as_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_0900_as_ci NOT NULL,
  `role` enum('admin','user') COLLATE utf8mb4_0900_as_ci NOT NULL DEFAULT 'user',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  CONSTRAINT `chk_users_email` CHECK (regexp_like(`email`,_utf8mb4'[^[:space:]\\x{FEFF}]')),
  CONSTRAINT `chk_users_name` CHECK (regexp_like(`name`,_utf8mb4'[^[:space:]\\x{FEFF}]')),
  CONSTRAINT `chk_users_password` CHECK (regexp_like(`password_hash`,_utf8mb4'[^[:space:]\\x{FEFF}]'))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`) VALUES (1,'Omer','admin@homelab.example','$2y$12$YCaEtzd1BsPR2VJrE7S5U.0AB.aWu01w3R5ydUtqAr68nqY3bIWka','admin');
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`) VALUES (2,'Mina','user@homelab.example','$2y$12$.onwhodWDsf/qe/FhSFxa.m9zwoLv5Q5oFCFwcbF0E/aLX9bsarsG','user');
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
