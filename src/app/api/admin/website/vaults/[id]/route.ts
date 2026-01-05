import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const VAULTS_KEY = 'website:vaults';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vaults: any[] = await redis.get(VAULTS_KEY) || [];
    const vault = vaults.find(v => v.id === id);
    
    if (!vault) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }
    
    return NextResponse.json(vault);
  } catch (error) {
    console.error('Vault fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch vault' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vaults: any[] = await redis.get(VAULTS_KEY) || [];
    const filtered = vaults.filter(v => v.id !== id);
    
    if (filtered.length === vaults.length) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }
    
    await redis.set(VAULTS_KEY, filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vault delete error:', error);
    return NextResponse.json({ error: 'Failed to delete vault' }, { status: 500 });
  }
}
