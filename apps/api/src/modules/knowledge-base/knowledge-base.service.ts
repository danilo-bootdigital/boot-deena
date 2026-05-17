import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
import { QueueService } from '../queue/queue.service';
import type { CreateKnowledgeBaseDto, UpdateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';

@Injectable()
export class KnowledgeBaseService {
  private supabase;

  constructor(
    private configService: ConfigService,
    private queueService: QueueService,
  ) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseServiceRoleKey'),
    );
  }

  async findAll(organizationId: string) {
    const { data, error } = await this.supabase
      .from('knowledge_bases')
      .select('*, documents(count)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findOne(id: string, organizationId: string) {
    const { data, error } = await this.supabase
      .from('knowledge_bases')
      .select('*, documents(*)')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) throw new NotFoundException('Knowledge base not found');
    return data;
  }

  async create(organizationId: string, dto: CreateKnowledgeBaseDto) {
    const { data, error } = await this.supabase
      .from('knowledge_bases')
      .insert({ ...dto, organization_id: organizationId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, organizationId: string, dto: UpdateKnowledgeBaseDto) {
    const { data, error } = await this.supabase
      .from('knowledge_bases')
      .update(dto)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Knowledge base not found');
    return data;
  }

  async remove(id: string, organizationId: string) {
    const { error } = await this.supabase
      .from('knowledge_bases')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw error;
    return { deleted: true };
  }

  async addDocument(
    knowledgeBaseId: string,
    organizationId: string,
    document: { name: string; source_url: string; mime_type?: string; size_bytes?: number },
  ) {
    const { data, error } = await this.supabase
      .from('documents')
      .insert({
        knowledge_base_id: knowledgeBaseId,
        organization_id: organizationId,
        name: document.name,
        source_url: document.source_url,
        mime_type: document.mime_type,
        size_bytes: document.size_bytes,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Enqueue for processing
    await this.queueService.addRagProcessing({
      documentId: data.id,
      knowledgeBaseId,
      organizationId,
    });

    return data;
  }

  async removeDocument(documentId: string, organizationId: string) {
    const { error } = await this.supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('organization_id', organizationId);

    if (error) throw error;
    return { deleted: true };
  }
}
