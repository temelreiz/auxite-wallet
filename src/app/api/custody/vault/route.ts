// src/app/api/custody/vault/route.ts
// Vault Management API - Create and manage custody vaults

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import {
  initializeCustody,
  createVault,
  getVaultByUserId,
  getDepositAddresses,
  getAllBalances,
} from '@/lib/custody';

const JWT_SECRET = process.env.JWT_SECRET!;

// ============================================
// GET - Get user's vault info
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    // Initialize custody adapters
    await initializeCustody();

    // Get user's vault
    const vault = await getVaultByUserId(decoded.userId);

    if (!vault) {
      return NextResponse.json({
        success: true,
        vault: null,
        message: 'No vault found. Create one to start.',
      });
    }

    // Get deposit addresses
    const addresses = await getDepositAddresses(vault.id);

    // Get balances
    const balances = await getAllBalances(vault.id);

    return NextResponse.json({
      success: true,
      vault: {
        id: vault.id,
        status: vault.status,
        name: vault.name,
        createdAt: vault.createdAt,
        provider: vault.provider,
      },
      addresses: addresses.map((addr) => ({
        asset: addr.asset,
        network: addr.network,
        address: addr.address,
        tag: addr.tag,
      })),
      balances,
    });
  } catch (error: any) {
    console.error('Get vault error:', error);

    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get vault' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Create new vault
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const body = await request.json().catch(() => ({}));
    const { name } = body;

    // Initialize custody adapters
    await initializeCustody();

    // Check if user already has a vault
    const existingVault = await getVaultByUserId(decoded.userId);
    if (existingVault) {
      return NextResponse.json(
        { success: false, error: 'Vault already exists' },
        { status: 409 }
      );
    }

    // Create vault
    const { vault, addresses } = await createVault({
      userId: decoded.userId,
      name: name || 'Client Vault',
    });

    console.log(`[Custody API] Vault created for user ${decoded.userId}: ${vault.id}`);

    return NextResponse.json({
      success: true,
      message: 'Your vault has been successfully created.',
      vault: {
        id: vault.id,
        status: vault.status,
        name: vault.name,
        createdAt: vault.createdAt,
      },
      addresses: addresses.map((addr) => ({
        asset: addr.asset,
        network: addr.network,
        address: addr.address,
        tag: addr.tag,
      })),
    });
  } catch (error: any) {
    console.error('Create vault error:', error);

    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    if (error.message === 'User already has a vault') {
      return NextResponse.json(
        { success: false, error: 'Vault already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create vault' },
      { status: 500 }
    );
  }
}
