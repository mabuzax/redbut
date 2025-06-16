import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MenuItem, Prisma } from '@prisma/client';

export interface CreateMenuItemDto {
  category?: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  status?: string;
  video?: string;
  served_info?: string;
  available_options?: any;
  available_extras?: any;
}

export interface UpdateMenuItemDto extends Partial<CreateMenuItemDto> {}

export interface MenuFilters {
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface MenuItemUploadData {
  category?: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  status?: string;
  video?: string;
  served_info?: string;
  available_options?: string | any;
  available_extras?: string | any;
}

@Injectable()
export class AdminMenuService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all menu items with filtering and pagination
   */
  async getAllMenuItems(filters: MenuFilters = {}) {
    const {
      category,
      status,
      search,
      page = 1,
      pageSize = 20,
    } = filters;

    const where: Prisma.MenuItemWhereInput = {};

    if (category && category !== 'all') {
      where.category = category;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.menuItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.menuItem.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get menu item by ID
   */
  async getMenuItemById(id: string): Promise<MenuItem> {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }

    return item;
  }

  /**
   * Create a new menu item
   */
  async createMenuItem(data: CreateMenuItemDto): Promise<MenuItem> {
    try {
      const menuItem = await this.prisma.menuItem.create({
        data: {
          ...data,
          price: new Prisma.Decimal(data.price),
          available_options: data.available_options ? data.available_options : Prisma.JsonNull,
          available_extras: data.available_extras ? data.available_extras : Prisma.JsonNull,
        },
      });

      return menuItem;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(`Failed to create menu item: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update an existing menu item
   */
  async updateMenuItem(id: string, data: UpdateMenuItemDto): Promise<MenuItem> {
    await this.getMenuItemById(id); // Check if exists

    try {
      const updatedData: Prisma.MenuItemUpdateInput = { ...data };
      
      if (data.price !== undefined) {
        updatedData.price = new Prisma.Decimal(data.price);
      }
      if (data.available_options !== undefined) {
        updatedData.available_options = data.available_options ? data.available_options : Prisma.JsonNull;
      }
      if (data.available_extras !== undefined) {
        updatedData.available_extras = data.available_extras ? data.available_extras : Prisma.JsonNull;
      }


      const menuItem = await this.prisma.menuItem.update({
        where: { id },
        data: updatedData,
      });

      return menuItem;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(`Failed to update menu item: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete a menu item
   */
  async deleteMenuItem(id: string): Promise<void> {
    await this.getMenuItemById(id); // Check if exists

    try {
      await this.prisma.menuItem.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(`Failed to delete menu item: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Bulk upload menu items from processed XLSX data
   */
  async bulkUploadMenuItems(items: MenuItemUploadData[]): Promise<{ created: number; failed: number }> {
    let created = 0;
    let failed = 0;

    for (const item of items) {
      try {
        // Parse JSON strings if necessary
        let availableOptions: Prisma.JsonValue | undefined = undefined;
        let availableExtras: Prisma.JsonValue | undefined = undefined;

        if (item.available_options) {
          if (typeof item.available_options === 'string') {
            try {
              availableOptions = JSON.parse(item.available_options);
            } catch {
              // If parsing fails, treat as a simple string array or handle as error
              // For now, let's assume it could be a comma-separated string for options
              availableOptions = item.available_options.split(',').map(s => s.trim());
            }
          } else {
            availableOptions = item.available_options;
          }
        }

        if (item.available_extras) {
          if (typeof item.available_extras === 'string') {
            try {
              availableExtras = JSON.parse(item.available_extras);
            } catch {
              availableExtras = item.available_extras.split(',').map(s => s.trim());
            }
          } else {
            availableExtras = item.available_extras;
          }
        }
        
        const createData: CreateMenuItemDto = {
          category: item.category,
          name: item.name,
          description: item.description,
          image: item.image,
          price: Number(item.price), // Ensure price is a number
          status: item.status || 'Active',
          video: item.video,
          served_info: item.served_info,
          available_options: availableOptions || Prisma.JsonNull,
          available_extras: availableExtras || Prisma.JsonNull,
        };
        
        await this.createMenuItem(createData);

        created++;
      } catch (error) {
        console.error(`Failed to create menu item: ${item.name}`, error);
        failed++;
      }
    }

    return { created, failed };
  }

  /**
   * Get available categories
   */
  async getCategories(): Promise<string[]> {
    const result = await this.prisma.menuItem.findMany({
      where: {
        category: { not: null },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
    });

    return result.map(item => item.category as string).filter(Boolean);
  }
}
