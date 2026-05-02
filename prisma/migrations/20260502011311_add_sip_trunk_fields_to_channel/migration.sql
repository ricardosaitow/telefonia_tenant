-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "pbx_gateway_uuid" UUID,
ADD COLUMN     "sip_host" TEXT,
ADD COLUMN     "sip_password" TEXT,
ADD COLUMN     "sip_port" INTEGER DEFAULT 5060,
ADD COLUMN     "sip_register" BOOLEAN DEFAULT true,
ADD COLUMN     "sip_transport" TEXT DEFAULT 'udp',
ADD COLUMN     "sip_username" TEXT;
