import { Types } from 'mongoose';
import { Address, AddressResponseDTO } from './address.model.js';
import { CreateAddressDTO, UpdateAddressDTO } from './address.types.js';
import { MAX_ADDRESSES_PER_USER } from './address.constants.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';

export class AddressService {
  async createAddress(userId: string, dto: CreateAddressDTO): Promise<AddressResponseDTO> {
    const userObjectId = new Types.ObjectId(userId);
    const existingCount = await Address.countDocuments({ userId: userObjectId });

    if (existingCount >= MAX_ADDRESSES_PER_USER) {
      throw AppError.conflict(
        `Address limit of ${MAX_ADDRESSES_PER_USER} reached. Please remove an unused address.`,
        ErrorCodes.ERR_ADDRESS_LIMIT_REACHED
      );
    }

    // Determine default status: First address automatically becomes default shipping & billing
    let isDefaultShipping = dto.isDefaultShipping ?? false;
    let isDefaultBilling = dto.isDefaultBilling ?? false;

    if (existingCount === 0) {
      isDefaultShipping = true;
      isDefaultBilling = true;
    }

    // If new address is marked as default, unset existing defaults for this user
    if (isDefaultShipping) {
      await Address.updateMany({ userId: userObjectId }, { isDefaultShipping: false });
    }
    if (isDefaultBilling) {
      await Address.updateMany({ userId: userObjectId }, { isDefaultBilling: false });
    }

    const address = new Address({
      userId: userObjectId,
      label: dto.label ?? null,
      fullName: dto.fullName,
      phone: dto.phone,
      country: dto.country,
      stateProvince: dto.stateProvince,
      city: dto.city,
      area: dto.area ?? null,
      postalCode: dto.postalCode ?? null,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2 ?? null,
      isDefaultShipping,
      isDefaultBilling,
    });

    await address.save();
    return address.toJSON() as unknown as AddressResponseDTO;
  }

  async listAddresses(userId: string): Promise<AddressResponseDTO[]> {
    const userObjectId = new Types.ObjectId(userId);
    const addresses = await Address.find({ userId: userObjectId }).sort({
      isDefaultShipping: -1,
      isDefaultBilling: -1,
      updatedAt: -1,
    });

    return addresses.map((addr) => addr.toJSON() as unknown as AddressResponseDTO);
  }

  async getAddress(userId: string, addressId: string): Promise<AddressResponseDTO> {
    const userObjectId = new Types.ObjectId(userId);
    const addressObjectId = new Types.ObjectId(addressId);

    const address = await Address.findOne({
      _id: addressObjectId,
      userId: userObjectId,
    });

    if (!address) {
      throw AppError.notFound('Address not found.', ErrorCodes.ERR_ADDRESS_NOT_FOUND);
    }

    return address.toJSON() as unknown as AddressResponseDTO;
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDTO
  ): Promise<AddressResponseDTO> {
    const userObjectId = new Types.ObjectId(userId);
    const addressObjectId = new Types.ObjectId(addressId);

    const address = await Address.findOne({
      _id: addressObjectId,
      userId: userObjectId,
    });

    if (!address) {
      throw AppError.notFound('Address not found.', ErrorCodes.ERR_ADDRESS_NOT_FOUND);
    }

    if (dto.label !== undefined) address.label = dto.label;
    if (dto.fullName !== undefined) address.fullName = dto.fullName;
    if (dto.phone !== undefined) address.phone = dto.phone;
    if (dto.country !== undefined) address.country = dto.country;
    if (dto.stateProvince !== undefined) address.stateProvince = dto.stateProvince;
    if (dto.city !== undefined) address.city = dto.city;
    if (dto.area !== undefined) address.area = dto.area;
    if (dto.postalCode !== undefined) address.postalCode = dto.postalCode;
    if (dto.addressLine1 !== undefined) address.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) address.addressLine2 = dto.addressLine2;

    if (dto.isDefaultShipping === true) {
      await Address.updateMany(
        { userId: userObjectId, _id: { $ne: addressObjectId } },
        { isDefaultShipping: false }
      );
      address.isDefaultShipping = true;
    }

    if (dto.isDefaultBilling === true) {
      await Address.updateMany(
        { userId: userObjectId, _id: { $ne: addressObjectId } },
        { isDefaultBilling: false }
      );
      address.isDefaultBilling = true;
    }

    await address.save();
    return address.toJSON() as unknown as AddressResponseDTO;
  }

  async setDefaultShipping(userId: string, addressId: string): Promise<AddressResponseDTO> {
    const userObjectId = new Types.ObjectId(userId);
    const addressObjectId = new Types.ObjectId(addressId);

    const address = await Address.findOne({
      _id: addressObjectId,
      userId: userObjectId,
    });

    if (!address) {
      throw AppError.notFound('Address not found.', ErrorCodes.ERR_ADDRESS_NOT_FOUND);
    }

    await Address.updateMany(
      { userId: userObjectId, _id: { $ne: addressObjectId } },
      { isDefaultShipping: false }
    );

    address.isDefaultShipping = true;
    await address.save();

    return address.toJSON() as unknown as AddressResponseDTO;
  }

  async setDefaultBilling(userId: string, addressId: string): Promise<AddressResponseDTO> {
    const userObjectId = new Types.ObjectId(userId);
    const addressObjectId = new Types.ObjectId(addressId);

    const address = await Address.findOne({
      _id: addressObjectId,
      userId: userObjectId,
    });

    if (!address) {
      throw AppError.notFound('Address not found.', ErrorCodes.ERR_ADDRESS_NOT_FOUND);
    }

    await Address.updateMany(
      { userId: userObjectId, _id: { $ne: addressObjectId } },
      { isDefaultBilling: false }
    );

    address.isDefaultBilling = true;
    await address.save();

    return address.toJSON() as unknown as AddressResponseDTO;
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    const addressObjectId = new Types.ObjectId(addressId);

    const address = await Address.findOne({
      _id: addressObjectId,
      userId: userObjectId,
    });

    if (!address) {
      throw AppError.notFound('Address not found.', ErrorCodes.ERR_ADDRESS_NOT_FOUND);
    }

    const wasDefaultShipping = address.isDefaultShipping;
    const wasDefaultBilling = address.isDefaultBilling;

    await address.deleteOne();

    // If deleted address was default, promote the most recently updated remaining address
    if (wasDefaultShipping || wasDefaultBilling) {
      const remaining = await Address.find({ userId: userObjectId }).sort({ updatedAt: -1 });
      if (remaining.length > 0) {
        const replacement = remaining[0];
        if (wasDefaultShipping) {
          replacement.isDefaultShipping = true;
        }
        if (wasDefaultBilling) {
          replacement.isDefaultBilling = true;
        }
        await replacement.save();
      }
    }
  }
}

export const addressService = new AddressService();
