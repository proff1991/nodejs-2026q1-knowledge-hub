import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  create(createUserDto: CreateUserDto): User {
    throw new Error('Not implemented');
  }

  findAll(): User[] {
    throw new Error('Not implemented');
  }

  findOne(id: string): User {
    throw new Error('Not implemented');
  }

  update(id: string, updateUserDto: UpdateUserDto): User {
    throw new Error('Not implemented');
  }

  remove(id: string): void {
    throw new Error('Not implemented');
  }
}